// The one database error the dashboard recognises.
//
// Everything else is left to throw. An action that swallows the unexpected is
// an action that saves nothing and tells him it saved, which on this dashboard
// is worse than a stack trace.

/**
 * A unique violation — SQLSTATE `23505`.
 *
 * Two columns in the schema can hit this from an ordinary day's work:
 * `pieces.slug`, which is derived from the piece's name, and
 * `garment_types.key`, which he types. Both were a raw 500 until Phase 5 R4.
 *
 * Matched on the code rather than on the message, which is localised by the
 * server's own settings and is not ours to depend on.
 *
 * ## It walks the cause chain, and that is the whole of the bug this had
 *
 * Drizzle does not rethrow what postgres.js threw. It wraps it in a
 * `DrizzleQueryError` carrying *Failed query: insert into "pieces" …*, and the
 * `PostgresError` with the SQLSTATE on it is the `cause`. Checking `code` on the
 * error itself finds nothing and the catch never fires — which is exactly what
 * the first build of this did, and it took a real duplicate in the preview
 * runtime to show it.
 *
 * The walk is bounded rather than recursive-until-null: a cycle in a cause chain
 * would otherwise hang a request, and nothing here nests more than twice.
 */
export function isDuplicate(error: unknown): boolean {
	let current: unknown = error;

	for (let depth = 0; depth < 5; depth += 1) {
		if (typeof current !== "object" || current === null) return false;
		if ((current as { code?: unknown }).code === "23505") return true;
		current = (current as { cause?: unknown }).cause;
	}

	return false;
}
