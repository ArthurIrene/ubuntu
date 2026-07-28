#!/usr/bin/env node
/**
 * Creates the one account. **Run by hand, once.**
 *
 *   pnpm admin:seed
 *
 * It does two things that have to agree with each other:
 *
 *  1. creates the Supabase Auth user that holds the password *(R12a/b)*, and
 *  2. writes the `admin` row that holds the revocation clock *(R12c)*, linked
 *     to it by `auth_user_id`.
 *
 * Supabase cannot hold the second and our database cannot hold the first, which
 * is the whole reason both exist. Running this twice is safe: it finds the user
 * and updates the row.
 *
 * ## What it will not do
 *
 * It does not invent a password and it does not print one. Pass the address and
 * the password in the environment, from a password manager:
 *
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... pnpm admin:seed
 *
 * **The login address is not the address printed on the site** *(R12a)*. That
 * mailbox is the root of trust under every option considered, so it carries its
 * own 2FA and it is not the one strangers write to.
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
		if (!match) continue;
		out[match[1]] = match[2].replace(/^["']|["']$/g, "");
	}
	return out;
}

const files = [".env.local", ".env", ".dev.vars"].map((name) => readEnvFile(join(ROOT, name)));

function setting(name) {
	if (process.env[name]) return process.env[name];
	for (const file of files) if (file[name]) return file[name];
	return undefined;
}

function required(name) {
	const value = setting(name);
	if (!value) {
		console.error(`Missing ${name}.`);
		console.error("");
		console.error("Needed: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL,");
		console.error("ADMIN_EMAIL, ADMIN_PASSWORD. The first three belong in .dev.vars;");
		console.error("the last two are passed on the command line and not written down.");
		process.exit(2);
	}
	return value;
}

async function supabase(path, method, body) {
	const url = required("SUPABASE_URL").replace(/\/$/, "");
	const key = required("SUPABASE_SERVICE_ROLE_KEY");
	const response = await fetch(`${url}${path}`, {
		method,
		headers: {
			apikey: key,
			Authorization: `Bearer ${key}`,
			"Content-Type": "application/json",
		},
		body: body ? JSON.stringify(body) : undefined,
	});
	const json = await response.json().catch(() => ({}));
	return { status: response.status, json };
}

async function findUser(email) {
	// The admin list endpoint filters by email. One account, so one page.
	const { status, json } = await supabase(
		`/auth/v1/admin/users?page=1&per_page=200`,
		"GET",
		undefined,
	);
	if (status >= 400) return null;
	const users = Array.isArray(json.users) ? json.users : [];
	return users.find((user) => String(user.email).toLowerCase() === email.toLowerCase()) ?? null;
}

async function main() {
	const email = required("ADMIN_EMAIL").trim().toLowerCase();
	const password = required("ADMIN_PASSWORD");

	if (password.length < 12) {
		console.error("ADMIN_PASSWORD is shorter than 12 characters.");
		console.error("This is the one factor his phone does not contain. Make it long.");
		process.exit(1);
	}

	let user = await findUser(email);

	if (user) {
		console.log("Auth user exists — updating the password.");
		const { status, json } = await supabase(`/auth/v1/admin/users/${user.id}`, "PUT", {
			password,
			email_confirm: true,
		});
		if (status >= 400) {
			console.error(`Supabase refused the update (${status}): ${json.msg ?? json.message ?? ""}`);
			process.exit(1);
		}
	} else {
		console.log("Creating the auth user.");
		const { status, json } = await supabase("/auth/v1/admin/users", "POST", {
			email,
			password,
			// Confirmed on creation: there is nobody to click a confirmation link
			// but him, and he is about to be asked for a magic link anyway.
			email_confirm: true,
		});
		if (status >= 400) {
			console.error(`Supabase refused (${status}): ${json.msg ?? json.message ?? ""}`);
			process.exit(1);
		}
		user = json;
	}

	const postgres = (await import("postgres")).default;
	const sql = postgres(required("DATABASE_URL"), { max: 1, prepare: false, onnotice: () => {} });

	try {
		const [existing] = await sql`SELECT id FROM admin LIMIT 1`;
		if (existing) {
			await sql`
				UPDATE admin
				SET email = ${email}, auth_user_id = ${user.id}, updated_at = now()
				WHERE id = ${existing.id}
			`;
			console.log("Admin row updated.");
		} else {
			await sql`
				INSERT INTO admin (email, auth_user_id) VALUES (${email}, ${user.id})
			`;
			console.log("Admin row created.");
		}
	} finally {
		await sql.end({ timeout: 5 });
	}

	console.log("");
	console.log("Done. Two things left, both outside this script:");
	console.log("  · set JWT expiry to ~15 minutes in the Supabase auth settings (R12c)");
	console.log("  · make sure your mailbox 2FA recovery exists somewhere other than that phone");
}

main().catch((error) => {
	console.error("");
	console.error("Seed failed:", error instanceof Error ? error.message : error);
	process.exit(1);
});
