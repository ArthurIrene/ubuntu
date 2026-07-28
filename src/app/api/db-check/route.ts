// The route that settles `ubuntu-technical.md` §10's first open question:
// **the Postgres connection path from Workers, answered by a deployed Worker
// reading a real row.**
//
// It reads the settings singleton — a real row in a real table — and reports
// how long the round trip took. That number is the actual answer: Supabase has
// no African region, and the whole reason this site renders on the server is
// that a Kigali phone should not be the thing waiting on Europe. Direct versus
// Hyperdrive is decided by running both and reading this.
//
// ## What it is allowed to say
//
// Nothing personal, ever. It reads two integers off a globals row and counts
// milliseconds. It touches no order, no customer, no fit record, and it will
// not grow into a health dashboard — anything that needs those is behind the
// dashboard login.
//
// It sits under `/api`, which `src/lib/gate.ts` keeps outside the public tree
// and outside the locale tree, so it needs no gate change and gains no `/en`.

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getDb, schema } from "@/db/client";

/** Never prerendered, never cached — the point is that it runs now. */
export const dynamic = "force-dynamic";

/** No store anywhere, and no indexing. It is a probe, not a page. */
const HEADERS = {
	"Cache-Control": "no-store",
	"X-Robots-Tag": "noindex, nofollow",
} as const;

export async function GET() {
	const startedAt = Date.now();

	try {
		const db = await getDb();

		const [row] = await db
			.select({
				id: schema.settings.id,
				queueOffsetDays: schema.settings.queueOffsetDays,
			})
			.from(schema.settings)
			.where(eq(schema.settings.id, 1))
			.limit(1);

		if (!row) {
			// The connection worked and the schema is there, but the singleton is
			// not — which means the migration ran without its last statement.
			return NextResponse.json(
				{
					ok: false,
					reason: "connected, but the settings singleton is missing",
					elapsedMs: Date.now() - startedAt,
				},
				{ status: 500, headers: HEADERS },
			);
		}

		return NextResponse.json(
			{
				ok: true,
				read: { table: "settings", id: row.id, queueOffsetDays: row.queueOffsetDays },
				elapsedMs: Date.now() - startedAt,
			},
			{ headers: HEADERS },
		);
	} catch (error) {
		// The message only. A Postgres error can carry the connection string,
		// and a stack can carry a query — neither belongs in a response body or
		// in the Worker log.
		return NextResponse.json(
			{
				ok: false,
				reason: error instanceof Error ? error.message : "unknown error",
				elapsedMs: Date.now() - startedAt,
			},
			{ status: 500, headers: HEADERS },
		);
	}
}
