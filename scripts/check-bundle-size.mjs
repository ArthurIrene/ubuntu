#!/usr/bin/env node
/**
 * Measures the Worker bundle against the Cloudflare free-plan size limit.
 *
 * The limit is on the *compressed* Worker, and it is the whole module graph —
 * not `.open-next/worker.js`, which is only a ~2 KB entry that imports the rest.
 * Wrangler is what bundles that graph into the thing it uploads, so we ask
 * wrangler to do a dry run and measure what it emits.
 *
 * Cloudflare docs, Workers > Platform > Limits:
 *   after compression (gzip)   Free 3 MB   Paid 10 MB
 *   before compression         Free 64 MB  Paid 64 MB
 * https://developers.cloudflare.com/workers/platform/limits/
 *
 * The docs write "3 MB" and wrangler reports sizes in KiB, so we read the
 * ceiling as 3 MiB. If you want the paranoid reading, pass the decimal value:
 *   node scripts/check-bundle-size.mjs --limit 3000000
 *
 * Usage:
 *   node scripts/check-bundle-size.mjs                 # against the 3 MiB ceiling
 *   node scripts/check-bundle-size.mjs --limit 2MiB    # tighter, for early warning
 *   BUNDLE_LIMIT=2MiB node scripts/check-bundle-size.mjs
 *
 * Exits non-zero when the bundle is over the limit. Requires a build first
 * (`opennextjs-cloudflare build`); it does not run one.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WORKER_ENTRY = join(ROOT, ".open-next", "worker.js");
const OUT_DIR = join(ROOT, ".open-next", ".bundle-size");

/** Free plan, after gzip. See the doc link above for the MB/MiB note. */
const DEFAULT_LIMIT = 3 * 1024 * 1024;

/** Emitted by wrangler alongside the modules, but never uploaded. */
const NOT_UPLOADED = [/\.map$/, /^README\.md$/];

const UNITS = {
	b: 1,
	kb: 1000,
	mb: 1000 * 1000,
	kib: 1024,
	mib: 1024 * 1024,
};

/** Accepts `3145728`, `3MiB`, `2.5 MB`, `900kb`. */
function parseSize(input) {
	const match = String(input)
		.trim()
		.toLowerCase()
		.match(/^([\d.]+)\s*(b|kb|mb|kib|mib)?$/);
	if (!match) return null;
	const value = Number(match[1]);
	if (!Number.isFinite(value) || value <= 0) return null;
	return Math.round(value * UNITS[match[2] ?? "b"]);
}

function parseLimit(argv) {
	const flag = argv.findIndex((a) => a === "--limit" || a.startsWith("--limit="));
	const raw =
		flag === -1
			? process.env.BUNDLE_LIMIT
			: argv[flag].includes("=")
				? argv[flag].split("=").slice(1).join("=")
				: argv[flag + 1];
	if (raw === undefined || raw === "") return DEFAULT_LIMIT;

	const parsed = parseSize(raw);
	if (parsed === null) {
		console.error(`Not a size: ${raw}. Try 3MiB, 2.5MB, or a plain byte count.`);
		process.exit(2);
	}
	return parsed;
}

const kib = (bytes) => `${(bytes / 1024).toFixed(2)} KiB`;
const mib = (bytes) => `${(bytes / (1024 * 1024)).toFixed(3)} MiB`;
const size = (bytes) => `${kib(bytes)} (${mib(bytes)})`;

/** Walks up for node_modules/.bin/wrangler so this works under any package manager. */
function findWrangler() {
	for (let dir = ROOT; ; dir = dirname(dir)) {
		const bin = join(dir, "node_modules", ".bin", "wrangler");
		if (existsSync(bin)) return bin;
		if (dirname(dir) === dir) return null;
	}
}

function main() {
	const limit = parseLimit(process.argv.slice(2));

	if (!existsSync(WORKER_ENTRY)) {
		console.error("No build found at .open-next/worker.js.");
		console.error("Run `pnpm exec opennextjs-cloudflare build` first.");
		process.exit(2);
	}

	const wrangler = findWrangler();
	if (!wrangler) {
		console.error("Could not find node_modules/.bin/wrangler. Run `pnpm install`.");
		process.exit(2);
	}

	// A dry run bundles exactly what a deploy would upload, and uploads nothing.
	console.log("Bundling with wrangler (dry run, this takes a few minutes)...");
	rmSync(OUT_DIR, { recursive: true, force: true });
	const run = spawnSync(wrangler, ["deploy", "--dry-run", "--outdir", OUT_DIR], {
		cwd: ROOT,
		encoding: "utf8",
		maxBuffer: 32 * 1024 * 1024,
	});

	if (run.status !== 0) {
		console.error("wrangler failed to bundle the Worker:\n");
		console.error((run.stderr || run.stdout || "").trim() || `exit code ${run.status}`);
		process.exit(2);
	}

	const modules = readdirSync(OUT_DIR)
		.filter((name) => !NOT_UPLOADED.some((pattern) => pattern.test(name)))
		.filter((name) => statSync(join(OUT_DIR, name)).isFile())
		.sort();

	if (modules.length === 0) {
		console.error(`wrangler emitted no Worker modules into ${OUT_DIR}.`);
		process.exit(2);
	}

	let raw = 0;
	let gzipped = 0;
	const rows = modules.map((name) => {
		const bytes = readFileSync(join(OUT_DIR, name));
		const compressed = gzipSync(bytes).length;
		raw += bytes.length;
		gzipped += compressed;
		return { name, raw: bytes.length, gzipped: compressed };
	});

	const headroom = limit - gzipped;
	const used = (gzipped / limit) * 100;

	console.log("");
	if (rows.length > 1) {
		for (const row of rows) console.log(`  ${row.name}  ${kib(row.gzipped)} gzipped`);
		console.log("");
	}
	console.log(`  Worker bundle   ${size(gzipped)} gzipped`);
	console.log(`  Uncompressed    ${size(raw)}`);
	console.log(`  Limit           ${size(limit)}`);
	console.log(
		headroom >= 0
			? `  Headroom        ${size(headroom)}  (${used.toFixed(1)}% of the limit used)`
			: `  Over by         ${size(-headroom)}  (${used.toFixed(1)}% of the limit used)`,
	);

	// Cross-check against wrangler's own figure, so a change in how we measure
	// can never quietly drift away from what Cloudflare actually counts.
	const reported = (run.stdout + run.stderr).match(/gzip:\s*([\d.]+)\s*KiB/i);
	if (reported) {
		const theirs = Math.round(Number(reported[1]) * 1024);
		const drift = Math.abs(theirs - gzipped);
		if (drift > 4096) {
			console.log("");
			console.log(`  Note: wrangler reports ${kib(theirs)} gzipped, we measured ${kib(gzipped)}.`);
			console.log("  Trusting the larger of the two.");
			if (theirs > gzipped && theirs > limit) process.exit(1);
		}
	}

	console.log("");
	if (headroom < 0) {
		console.log("Over the limit. Cloudflare will refuse this deploy.");
		process.exit(1);
	}
	console.log("Within the limit.");
}

main();
