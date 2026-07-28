// The database connection. **The only module that opens one.**
//
// Same rule as the four adapters in `src/lib/`: no page, component or route
// handler builds a client. They import `db` from here and get a Drizzle
// instance with the schema attached.

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export * as schema from "./schema";

/** What a Drizzle instance over this schema is, for callers that need to name it. */
export type Database = ReturnType<typeof create>;

/**
 * How this Worker reaches Postgres, and why it is one expression.
 *
 * `ubuntu-technical.md` §10 lists the connection path as **answered only by
 * running it** — direct, Hyperdrive, or the Supabase HTTP client — to be
 * settled by a deployed Worker reading a real row. Hyperdrive's entire contract
 * is that it hands back an ordinary Postgres connection string, so the first
 * two of those three differ by *which string this line picks* and by nothing
 * else in the codebase.
 *
 * That is deliberate. Binding present, we go through Hyperdrive and get its
 * pooling; binding absent, we dial Supabase's pooler directly. Switching is a
 * `wrangler.jsonc` change and a redeploy, not a rewrite — which is what lets
 * §10's question be answered by measurement rather than by argument.
 *
 * The third option, the Supabase HTTP client, is the one that *would* be a
 * rewrite: it is a different wire protocol, it does not speak Drizzle's
 * postgres-js dialect, and it is a dependency this bundle would have to find
 * room for. It stays named and unbuilt.
 */
function connectionString(env: Record<string, unknown>): string {
	const hyperdrive = env.HYPERDRIVE as { connectionString?: string } | undefined;
	const url = hyperdrive?.connectionString ?? (env.DATABASE_URL as string | undefined);

	if (!url) {
		throw new Error(
			"db: no connection. Bind HYPERDRIVE in wrangler.jsonc, or set DATABASE_URL " +
				"(.dev.vars locally, a Cloudflare secret in production).",
		);
	}
	return url;
}

function create(url: string) {
	const sql = postgres(url, {
		// Supabase's pooler runs in transaction mode, where a prepared statement
		// cannot be relied on to outlive the statement that made it. postgres.js
		// prepares by default, so this is the setting that decides whether the
		// second query on a connection works. Hyperdrive sits in front of the
		// same pooler, so it is not conditional on which path we took.
		prepare: false,

		// One connection per request. The pool that matters now lives in
		// Hyperdrive, on Cloudflare's side of this socket — pooling again here
		// would only stack idle sockets in front of it.
		max: 1,

		// Skip the type-introspection round trip on first query. It costs a whole
		// request against a database in Europe serving customers in Kigali, to
		// learn about custom types this schema does not have.
		fetch_types: false,

		// Nothing in the connection string, and nothing a query carries, may
		// reach a log. An order token is a credential and a measurement is
		// personal data under Law 058/2021.
		onnotice: () => {},
	});

	return drizzle(sql, { schema, casing: "snake_case" });
}

/**
 * Open a connection for a given environment.
 *
 * Takes the env rather than reaching for it, so this file has no opinion about
 * whether it is running under OpenNext, under `wrangler dev`, or in a migration
 * script on a laptop. `getDb()` below is the convenience for the first case.
 *
 * **This always opens a new one.** It is `getDb()` that scopes reuse to a
 * request; a Node script calling this gets a client it owns and can end.
 */
export function connect(env: Record<string, unknown>): Database {
	return create(connectionString(env));
}

/**
 * The connection for this request — and never for the next one.
 *
 * This started life as a cache keyed by URL, held for the life of the isolate,
 * on the reasoning that a handshake to Europe is worth amortising. **Measured,
 * that version hangs.** A socket on Workers belongs to the request that opened
 * it; the isolate outlives the request, so the second request to reach a warm
 * isolate inherits a client whose socket it is not allowed to touch, and the
 * query never returns. The route times out rather than failing, which is the
 * worst shape a bug can take.
 *
 * Hyperdrive does not change that rule — it was tried with the cache still in,
 * and it still hung. What Hyperdrive changes is the *cost* of obeying it: the
 * pool sits at Cloudflare's edge, already connected to Supabase, so opening a
 * connection per request is a local handshake rather than a trip to Frankfurt.
 * That is the whole reason the cache is safe to delete instead of repair.
 *
 * The `WeakMap` is keyed on the request's own `ExecutionContext`, so one
 * request that reads the database three times still opens one connection, and
 * nothing survives into the next request.
 */
const perRequest = new WeakMap<object, Database>();

/**
 * The database, inside a Cloudflare request.
 *
 * Dynamic import of the OpenNext helper so that a Node script — the migration
 * runner, a test — can import this module for its types without pulling the
 * Workers runtime in behind it.
 */
export async function getDb(): Promise<Database> {
	const { getCloudflareContext } = await import("@opennextjs/cloudflare");
	const { env, ctx } = getCloudflareContext();

	const environment = env as unknown as Record<string, unknown>;

	// No context to key on — during a build-time evaluation, say. Fresh client,
	// no memo: the wrong thing to do here is fall back to sharing one.
	if (!ctx) return connect(environment);

	const existing = perRequest.get(ctx);
	if (existing) return existing;

	const db = connect(environment);
	perRequest.set(ctx, db);

	// Hand the connection back to Hyperdrive's pool instead of dropping it.
	//
	// Measured, this is the difference between a ~400ms read and a ~100ms one.
	// An abandoned socket is not a returned one: Hyperdrive tears the origin
	// connection down and the next request pays TLS and SCRAM to Frankfurt
	// again, which is most of that 300ms. A clean `end()` leaves a warm
	// connection behind for the request after this one.
	//
	// It has to run *after* the response, not with it — `end()` refuses new
	// queries the moment it is called, so anything earlier would break a page
	// that reads twice. `after()` is the only hook with that timing, and a
	// runtime without it is not a reason to fail a request that already
	// succeeded.
	try {
		const { after } = await import("next/server");
		after(() => db.$client.end({ timeout: 5 }));
	} catch {
		// No `after()` here. The socket closes with the request context anyway;
		// we lose the pooled connection, not the response.
	}

	return db;
}
