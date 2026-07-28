#!/usr/bin/env node
/**
 * Creates the two buckets. **Run by hand, once.**
 *
 *   pnpm storage:init
 *
 * **Public and private are two buckets, not one bucket with a naming
 * convention** *(R8)*. A public bucket serves anything in it to anyone holding
 * the URL — right for garment photos, which you want spread around, and wrong
 * for a customer's reference image or a progress shot. The boundary is enforced
 * by the store rather than by us remembering.
 *
 * These are Supabase Storage buckets rather than R2 ones, which is
 * `ubuntu-technical.md` §4's named fallback: *if R2 cannot be enabled, launch on
 * Supabase Storage and let the storage adapter absorb the swap later.* The swap
 * is `src/lib/storage.ts` and two environment variables.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readEnvFile(path) {
	if (!existsSync(path)) return {};
	const out = {};
	for (const line of readFileSync(path, "utf8").split("\n")) {
		const match = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
		if (match) out[match[1]] = match[2].replace(/^["']|["']$/g, "");
	}
	return out;
}

const files = [".env.local", ".env", ".dev.vars"].map((name) => readEnvFile(join(ROOT, name)));

function setting(name, fallback) {
	if (process.env[name]) return process.env[name];
	for (const file of files) if (file[name]) return file[name];
	return fallback;
}

const url = setting("SUPABASE_URL")?.replace(/\/$/, "");
const key = setting("SUPABASE_SERVICE_ROLE_KEY");

if (!url || !key) {
	console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
	process.exit(2);
}

const buckets = [
	{
		id: setting("STORAGE_PUBLIC_BUCKET", "ubuntu-public"),
		public: true,
		// A 1600px WebP off the browser pipeline is a few hundred kilobytes.
		file_size_limit: 2 * 1024 * 1024,
		allowed_mime_types: ["image/webp", "image/jpeg"],
	},
	{
		id: setting("STORAGE_PRIVATE_BUCKET", "ubuntu-private"),
		public: false,
		file_size_limit: 2 * 1024 * 1024,
		allowed_mime_types: ["image/webp", "image/jpeg"],
	},
];

for (const bucket of buckets) {
	const response = await fetch(`${url}/storage/v1/bucket`, {
		method: "POST",
		headers: {
			apikey: key,
			Authorization: `Bearer ${key}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ ...bucket, name: bucket.id }),
	});

	const body = await response.json().catch(() => ({}));

	if (response.ok) {
		console.log(`Created ${bucket.id} (${bucket.public ? "public" : "private"}).`);
	} else if (String(body.error ?? body.message ?? "").toLowerCase().includes("exist")) {
		console.log(`${bucket.id} already exists.`);
	} else {
		console.error(`Failed on ${bucket.id} (${response.status}): ${body.message ?? ""}`);
		process.exit(1);
	}
}

console.log("");
console.log("The public bucket is served from Supabase's own domain today.");
console.log("On R2 it moves to a custom hostname; that is the same one file.");
