// The fit fork's rules, as a pure function.
//
// **This is the DPA-load-bearing surface**, so the part that decides is
// separated from the part that renders and the part that writes: what a number
// means, which band it falls in, what gets refused and what gets recorded is all
// decided here, with no database, no request and no clock.
//
// Three bands *(R7)*:
//
// - **plausible** — passes silently.
// - **unlikely** — asks a gentle question that must be *acknowledged*, and **the
//   acknowledgement is recorded**. The bands are evidence, not validation.
// - **impossible** — the only hard stop.
//
// **A hard block on a real body is the site telling someone their body is
// wrong**, which is why only the outer band refuses, and why the bands live on
// `garment_type_measurements` where he can widen one the day a real customer is
// blocked, without a deploy.

import {
	band,
	isMeasurementKey,
	MEASUREMENTS,
	toCanonical,
	type MeasurementKey,
} from "@/content/measurements";

/** One measurement as the garment type asks for it — the bands in force today. */
export interface BandSpec {
	measurementKey: string;
	required: boolean;
	position: number;
	plausibleMin: number;
	plausibleMax: number;
	impossibleMin: number;
	impossibleMax: number;
}

/**
 * One row, ready for `fit_measurements`, with **everything that was on screen
 * beside it** *(R7)*.
 *
 * The label, the instruction and the bands are copied in rather than joined to
 * the garment type, because the garment type is a live dashboard row and this
 * has to say what the customer actually saw. *Our own stated measurements* means
 * the ones stated **on the day**.
 */
export interface FitRow {
	measurementKey: MeasurementKey;
	/** Canonical integer — millimetres for a length, grams for a weight. */
	value: number;
	label: string;
	instruction: string;
	plausibleMin: number | null;
	plausibleMax: number | null;
	impossibleMin: number | null;
	impossibleMax: number | null;
	/** The value fell outside plausible. Recorded whether or not it is later acknowledged. */
	warned: boolean;
	position: number;
}

export type FitRefusal =
	/** Outside the impossible band. The one hard stop. */
	| { kind: "impossible"; key: MeasurementKey; label: string }
	/** Asked for and not given. */
	| { kind: "missing"; key: MeasurementKey; label: string }
	/** Given, but not a number at all. */
	| { kind: "unreadable"; key: MeasurementKey; label: string };

export type FitOutcome =
	| { ok: true; rows: FitRow[] }
	| { ok: false; refusals: FitRefusal[] };

export interface FitInput {
	/** What the garment type asks for, in his order. */
	specs: BandSpec[];
	/** What they typed, keyed by measurement key. Untrimmed strings, as posted. */
	typed: Record<string, string>;
	/** The unit that was in front of them *(R7)*. `cm` at launch. */
	unit: "cm" | "in";
}

/**
 * Read a typed number in the unit they were shown.
 *
 * Commas and spaces are stripped because people type *1 750* and *1,75*; a
 * comma decimal is converted rather than rejected, since half the world writes
 * one and refusing it would be the form telling someone their keyboard is wrong.
 */
function parseTyped(raw: string): number | null {
	const cleaned = raw.trim().replace(/\s/g, "").replace(",", ".");
	if (!cleaned) return null;
	const value = Number(cleaned);
	return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Every number checked against the bands that were in force, and turned into
 * rows or into refusals.
 *
 * **Nothing is half-written.** Either every measurement is acceptable and the
 * whole record can be created, or none of it is and the customer is asked again
 * — a fit record missing the one number that was wrong is a record that reads as
 * though the question was never asked.
 */
export function evaluateFit({ specs, typed, unit }: FitInput): FitOutcome {
	const rows: FitRow[] = [];
	const refusals: FitRefusal[] = [];

	for (const spec of [...specs].sort((a, b) => a.position - b.position)) {
		const key = spec.measurementKey;
		// A key with no definition in code has nowhere to render on the drawing and
		// no instruction to snapshot, so it is not asked for at all *(R7)*.
		if (!isMeasurementKey(key)) continue;

		const definition = MEASUREMENTS[key];
		const raw = typed[key] ?? "";
		const parsed = parseTyped(raw);

		if (parsed === null) {
			if (spec.required) {
				refusals.push({
					kind: raw.trim() ? "unreadable" : "missing",
					key,
					label: definition.label,
				});
			}
			continue;
		}

		// **Millimetres stored as integers, displayed in centimetres** *(R7)* —
		// the same discipline as money, because a body measurement that has been
		// through a float is a body measurement that can come back different.
		const value = toCanonical(parsed, unit, key);
		const which = band(value, spec);

		if (which === "impossible") {
			refusals.push({ kind: "impossible", key, label: definition.label });
			continue;
		}

		rows.push({
			measurementKey: key,
			value,
			label: definition.label,
			instruction: definition.instruction,
			plausibleMin: spec.plausibleMin,
			plausibleMax: spec.plausibleMax,
			impossibleMin: spec.impossibleMin,
			impossibleMax: spec.impossibleMax,
			warned: which === "unlikely",
			position: spec.position,
		});
	}

	return refusals.length > 0 ? { ok: false, refusals } : { ok: true, rows };
}

/**
 * Who took the numbers, decided by the path they chose rather than asked twice
 * *(R7, R13a)*.
 *
 * - Path B is `standard` by definition — a size off the chart is not a
 *   measurement anybody took.
 * - Path A asks one question, because R7's enum assumed the person ordering is
 *   the person measured and R13a found the hole: **`guardian` is the customer
 *   measuring someone else** — a gift, or a child. Reusing `self` for that gets
 *   liability right and the record wrong, and adjudication is this record's
 *   entire job.
 * - **`ours` is never reachable from a public form.** It means measured at a
 *   physical point by us, and liability is fully his with no negotiation; only
 *   the dashboard can assert it, because only he was there.
 */
export function fitSource(
	path: "measurements" | "size",
	who: string,
): "self" | "guardian" | "tailor" | "standard" {
	if (path === "size") return "standard";
	if (who === "guardian") return "guardian";
	if (who === "tailor") return "tailor";
	return "self";
}

/**
 * Age at the time of the order, in years.
 *
 * **Never a date of birth** *(R13a)*. A birth date ages by itself and
 * identifies; a number does neither. **A child is never an entity here** — no
 * name, no row — so this number plus `source = guardian` is the entire
 * footprint, deliberately.
 *
 * Null for anything that is not a plain, sane number of years. An age is read
 * against the garment type's own band and is not a guardrail of its own.
 */
export function ageAtOrder(raw: string): number | null {
	const trimmed = raw.trim();
	// `Number("")` is 0, so an untouched field would otherwise record a newborn —
	// and on a `guardian` order that is a fact about a child that nobody typed.
	if (!trimmed) return null;

	const value = Number(trimmed);
	if (!Number.isInteger(value) || value < 0 || value > 120) return null;
	return value;
}

/**
 * The two bounds a browser can enforce on its own, in the unit on screen.
 *
 * **The impossible band, and only it.** `min` and `max` on a number input are
 * native HTML constraint validation — no JavaScript, and a screen reader
 * announces the range — so the one band that refuses is refused before a
 * request is made. The unlikely band deliberately gets no attribute: a browser
 * cannot ask a question, and turning *unusual* into *invalid* is exactly the
 * hard block on a real body that R7 refused.
 *
 * The server checks both bands again regardless. A rendered attribute is a
 * convenience; the write path is the rule.
 */
export function nativeBounds(
	spec: Pick<BandSpec, "measurementKey" | "impossibleMin" | "impossibleMax">,
	unit: "cm" | "in",
): { min: number; max: number; step: number } | null {
	const key = spec.measurementKey;
	if (!isMeasurementKey(key)) return null;

	// `band()` refuses `< impossibleMin` and `> impossibleMax`, and HTML's
	// min/max are inclusive — so the two agree exactly at the boundary.
	const scale = MEASUREMENTS[key].unit === "g" ? 1000 : unit === "in" ? 25.4 : 10;
	return {
		min: Math.round((spec.impossibleMin / scale) * 10) / 10,
		max: Math.round((spec.impossibleMax / scale) * 10) / 10,
		step: 0.1,
	};
}
