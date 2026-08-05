// The ranges version — **a grouping label, not the evidence.**
//
// Filed in Phase 4, built here.

import { max } from "drizzle-orm";

import { RANGES_VERSION } from "@/content/measurements";
import { getDb, schema } from "@/db/client";

/**
 * The label to write onto a fit record, derived from the bands themselves.
 *
 * ## Why this is derived rather than counted
 *
 * Phase 4 filed *increment-on-band-edit* as Phase 5's, and the obvious build is
 * a counter he bumps on every save. That is a column, and a column is a
 * migration — for a value whose only job is to say *these two records were taken
 * under the same regime.* `garment_type_measurements.updated_at` already answers
 * that, exactly, for free: **every path that edits a band writes it**, because
 * the upsert in Settings sets it and the row's default fills it on insert. The
 * newest one across the table moves whenever any band anywhere changes, and does
 * not move when nothing does — which is the whole of what a version number was
 * being asked for.
 *
 * So: no new column, no migration, no counter that can be reset or double-bumped
 * or forgotten in a second write path.
 *
 * ## Why it can be this cheap
 *
 * **The evidence is the snapshot.** Every fit measurement stores the literal band
 * values that were in force when the number was typed *(R7)*, so a dispute is
 * settled by reading the record itself and never by looking a version up in a
 * table that may since have been edited. This label groups records; it does not
 * prove anything, and it is not asked to.
 *
 * ## The shape
 *
 * An ISO instant to the second. It sorts, it is legible on the order screen where
 * it renders as *chart …*, and it says what it is. Records written before this
 * existed carry `"1"` and keep it: they were taken under a regime this cannot
 * reconstruct, and rewriting history to make a column tidy is not something a
 * liability record gets to do.
 *
 * With no bands set at all — which is production today — there is nothing to
 * derive from and it falls back to {@link RANGES_VERSION}, the same `"1"` those
 * earlier records carry. That is correct rather than convenient: no bands means
 * no regime, and inventing a timestamp for one would be a fact nobody made.
 *
 * **The column is not renamed.** `fit_records.size_chart_version` is `NOT NULL`,
 * written by two paths, and will hold exactly what its name says on the day the
 * S/M/L/XL chart lands. A rename is a migration in a round that generates none,
 * for no gain a comment cannot buy.
 */
export async function rangesVersion(
	db: Awaited<ReturnType<typeof getDb>>,
): Promise<string> {
	const [row] = await db
		.select({ latest: max(schema.garmentTypeMeasurements.updatedAt) })
		.from(schema.garmentTypeMeasurements);

	const latest = row?.latest;
	if (!latest) return String(RANGES_VERSION);

	// Seconds, not milliseconds: two bands saved in the same second are the same
	// regime, and the extra three digits are noise on a screen he reads.
	return `${latest.toISOString().slice(0, 19)}Z`;
}
