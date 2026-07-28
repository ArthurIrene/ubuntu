#!/usr/bin/env node
/**
 * Applies pending migrations to Postgres. **Run by hand.**
 *
 *   pnpm db:migrate
 *
 * ## Why this is not in the deploy
 *
 * `pnpm deploy` builds a Worker and uploads it. It does not touch the database,
 * and it must not: a deploy that migrates is a deploy that can fail halfway
 * through a schema change on a live database, at a moment chosen by whoever
 * pushed. There is nobody to call when that happens. A migration is a decision
 * he takes while watching, and the two steps are separate for the same reason
 * the launch switches are two lines rather than one — they fail differently.
 *
 * ## Forward-only, additive
 *
 * This refuses to apply a migration containing a destructive statement. Drizzle
 * Kit will happily generate a `DROP COLUMN` when a column leaves the schema
 * file, and the first time that runs against a live database is the first time
 * anyone finds out. If a column genuinely has to go, the deletion is written by
 * hand with the data question answered first, and this check is passed with
 * `--allow-destructive` deliberately.
 *
 * ## Where the URL comes from
 *
 *   DATABASE_URL=... pnpm db:migrate
 *
 * or `DATABASE_URL` in `.env.local`, or in `.dev.vars`. All three are
 * gitignored. Use Supabase's **session** connection string here, not the
 * transaction pooler: migrations run DDL in a transaction and want one stable
 * connection.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS = join(ROOT, "drizzle");

/** Statements that can lose data. Matched case-insensitively on whole words. */
const DESTRUCTIVE = [
	/\bDROP\s+TABLE\b/i,
	/\bDROP\s+COLUMN\b/i,
	/\bDROP\s+SCHEMA\b/i,
	/\bDROP\s+DATABASE\b/i,
	/\bTRUNCATE\b/i,
	/\bDROP\s+TYPE\b/i,
	/\bALTER\s+COLUMN\s+\w+\s+TYPE\b/i,
];

/** Reads `KEY=value` lines out of an env-style file. Enough for one variable. */
function readEnvFile(path) {
	if (!existsSync(path)) return {};
	const out = {};
	for (const line of readFileSync(path, "utf8").split("\n")) {
		const match = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
		if (!match) continue;
		out[match[1]] = match[2].replace(/^["']|["']$/g, "");
	}
	return out;
}

function databaseUrl() {
	if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
	for (const name of [".env.local", ".env", ".dev.vars"]) {
		const found = readEnvFile(join(ROOT, name)).DATABASE_URL;
		if (found) {
			console.log(`Using DATABASE_URL from ${name}.`);
			return found;
		}
	}
	console.error("No DATABASE_URL.");
	console.error("");
	console.error("  DATABASE_URL='postgresql://...' pnpm db:migrate");
	console.error("");
	console.error("or put it in .env.local (gitignored). Use Supabase's session");
	console.error("connection string, not the transaction pooler.");
	process.exit(2);
}

function checkForwardOnly(allowDestructive) {
	if (!existsSync(MIGRATIONS)) {
		console.error(`No migrations at ${MIGRATIONS}. Run \`pnpm db:generate\` first.`);
		process.exit(2);
	}

	const files = readdirSync(MIGRATIONS).filter((name) => name.endsWith(".sql"));
	const offences = [];

	for (const name of files) {
		const sql = readFileSync(join(MIGRATIONS, name), "utf8");
		for (const pattern of DESTRUCTIVE) {
			const hit = sql.match(pattern);
			if (hit) offences.push(`${name}: ${hit[0]}`);
		}
	}

	if (offences.length === 0) return files.length;

	if (allowDestructive) {
		console.warn("Destructive statements, applying anyway (--allow-destructive):");
		for (const offence of offences) console.warn(`  ${offence}`);
		console.warn("");
		return files.length;
	}

	console.error("Migrations are forward-only and additive. These are not:");
	console.error("");
	for (const offence of offences) console.error(`  ${offence}`);
	console.error("");
	console.error("Drizzle Kit generates a drop whenever something leaves the schema file.");
	console.error("Check that was intended. If it was, answer the data question first,");
	console.error("then re-run with --allow-destructive.");
	process.exit(1);
}

async function main() {
	const allowDestructive = process.argv.includes("--allow-destructive");
	const count = checkForwardOnly(allowDestructive);
	const url = databaseUrl();

	const [{ drizzle }, { migrate }, postgres] = await Promise.all([
		import("drizzle-orm/postgres-js"),
		import("drizzle-orm/postgres-js/migrator"),
		import("postgres").then((m) => m.default),
	]);

	// One connection, no pooling, and `max: 1` so the DDL runs in the order it
	// was written. `prepare: false` for the same pooler reason as the runtime
	// client, in case a session string is not what was supplied.
	const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });

	try {
		console.log(`Applying migrations from drizzle/ (${count} file${count === 1 ? "" : "s"})...`);
		await migrate(drizzle(sql), { migrationsFolder: MIGRATIONS });
		console.log("Up to date.");
	} finally {
		await sql.end({ timeout: 5 });
	}
}

main().catch((error) => {
	console.error("");
	console.error("Migration failed:");
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
