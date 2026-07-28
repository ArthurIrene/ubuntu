// What a measurement *is*. **Definitions in code, ranges in the dashboard**
// *(R7)*.
//
// A measurement only means something if it has a place on the drawing, and the
// drawing is code — so he cannot invent a measurement with nowhere to render.
// He *can* widen a guardrail the day a real customer is blocked, without a
// deploy, because the three bands live on `garment_type_measurements`.
//
// **The instruction ships beside the field, at the moment of entry — never in a
// tooltip** *(R7)*. It is the sentence the policy's shared-liability clause
// turns on, so it says where the tape goes and whether the number is taken on
// the body or on a garment laid flat. It is snapshotted onto the fit record, so
// wording it better later does not rewrite what this person was told.
//
// Per-garment wording is founder homework (`ubuntu-copy.md` §13, item 9). What
// is here is a strong draft in his voice, never `Lorem ipsum` and never empty.

/**
 * The version of *our own stated measurements* that was on the page.
 *
 * The policy distributes liability three ways against that phrase, and it is
 * meaningless without a version — *our own stated measurements* means the ones
 * stated **on the day** *(R7)*. **Bump this whenever a label, an instruction or
 * the size chart changes**, never when a guardrail band moves, because the
 * bands are snapshotted per measurement already.
 */
export const SIZE_CHART_VERSION = "2026-07-a";

/** Millimetres for every length, grams for a weight. Integers, like money. */
export type CanonicalUnit = "mm" | "g";

export interface MeasurementDefinition {
	/** The label as it reads on the form. */
	label: string;
	/** Where the tape goes. Beside the field, never in a tooltip. */
	instruction: string;
	unit: CanonicalUnit;
	/**
	 * The anchor this measurement has on the fit diagram.
	 *
	 * Named by measurement key, so a drawing referenced by two garment types
	 * labels both without either owning the file *(R13c)*.
	 */
	anchor: string;
}

/**
 * The closed list. He picks from this in Settings; he cannot add to it.
 *
 * Keyed by the string stored on `garment_type_measurements.measurement_key` and
 * on `fit_measurements.measurement_key`.
 */
export const MEASUREMENTS = {
	head: {
		label: "Head",
		instruction:
			"Around your head, just above the ears and across the middle of your forehead. Keep the tape level and snug, not tight.",
		unit: "mm",
		anchor: "head",
	},
	height: {
		label: "Height",
		instruction: "Standing straight against a wall, without shoes, from the floor to the top of the head.",
		unit: "mm",
		anchor: "height",
	},
	chest: {
		label: "Chest",
		instruction:
			"Around the fullest part of the chest, under the arms, with the tape level all the way round. Breathe normally.",
		unit: "mm",
		anchor: "chest",
	},
	waist: {
		label: "Waist",
		instruction:
			"Around your natural waist — the narrowest part, above the hip bone. Do not pull the tape in.",
		unit: "mm",
		anchor: "waist",
	},
	hip: {
		label: "Hip",
		instruction: "Around the fullest part of the hips, with your feet together.",
		unit: "mm",
		anchor: "hip",
	},
	shoulder: {
		label: "Shoulder",
		instruction:
			"Across the back, from the bone at the edge of one shoulder to the bone at the edge of the other.",
		unit: "mm",
		anchor: "shoulder",
	},
	sleeve: {
		label: "Sleeve",
		instruction:
			"From the edge of the shoulder, down the outside of a slightly bent arm, to the wrist bone.",
		unit: "mm",
		anchor: "sleeve",
	},
	back_length: {
		label: "Back length",
		instruction:
			"From the bone at the base of the neck, straight down the spine, to where you want the piece to end.",
		unit: "mm",
		anchor: "back_length",
	},
	inseam: {
		label: "Inseam",
		instruction:
			"From the crotch down the inside of the leg to where you want the hem. Easiest taken from a pair of shorts that already fit, laid flat.",
		unit: "mm",
		anchor: "inseam",
	},
	outseam: {
		label: "Outseam",
		instruction: "From the top of the waistband down the outside of the leg to the hem.",
		unit: "mm",
		anchor: "outseam",
	},
	thigh: {
		label: "Thigh",
		instruction: "Around the fullest part of the thigh, standing.",
		unit: "mm",
		anchor: "thigh",
	},
	neck: {
		label: "Neck",
		instruction: "Around the base of the neck, with one finger between the tape and the skin.",
		unit: "mm",
		anchor: "neck",
	},
	/**
	 * Recorded beside a chosen size rather than instead of one.
	 *
	 * Standard sizing is a real choice, not a fallback — *he checks every order
	 * himself against your height and weight before anything is cut* — and this
	 * is what he checks it against. **No suggested size is computed from it**
	 * *(R7)*: that would quietly assume the liability the policy just spent three
	 * clauses distributing.
	 */
	weight: {
		label: "Weight",
		instruction: "Your weight, as near as you know it. He uses it to sanity-check a chosen size.",
		unit: "g",
		anchor: "weight",
	},
} as const satisfies Record<string, MeasurementDefinition>;

export type MeasurementKey = keyof typeof MEASUREMENTS;

export const MEASUREMENT_KEYS = Object.keys(MEASUREMENTS) as MeasurementKey[];

export function isMeasurementKey(value: string): value is MeasurementKey {
	return value in MEASUREMENTS;
}

/**
 * What the customer typed, in the unit they typed it, converted to the
 * canonical integer.
 *
 * **Millimetres stored as integers, displayed in centimetres** *(R7)* — the
 * same discipline as money, because a body measurement that has been through a
 * float is a body measurement that can come back different.
 */
export function toCanonical(value: number, unit: "cm" | "in", key: MeasurementKey): number {
	if (MEASUREMENTS[key].unit === "g") return Math.round(value * 1000);
	return Math.round(unit === "in" ? value * 25.4 : value * 10);
}

/** The canonical integer, back in the unit a person reads. */
export function fromCanonical(value: number, unit: "cm" | "in", key: MeasurementKey): number {
	if (MEASUREMENTS[key].unit === "g") return Math.round(value / 10) / 100;
	return unit === "in"
		? Math.round((value / 25.4) * 10) / 10
		: Math.round(value) / 10;
}

/**
 * Which of the three bands a value falls in *(R7)*.
 *
 * - `plausible` — passes silently.
 * - `unlikely` — asks a gentle question that must be **acknowledged**, and the
 *   acknowledgement is recorded. The bands are evidence, not validation.
 * - `impossible` — the only hard stop.
 *
 * **A hard block on a real body is the site telling someone their body is
 * wrong**, which is why only the outer band refuses.
 */
export function band(
	value: number,
	bands: { plausibleMin: number; plausibleMax: number; impossibleMin: number; impossibleMax: number },
): "plausible" | "unlikely" | "impossible" {
	if (value < bands.impossibleMin || value > bands.impossibleMax) return "impossible";
	if (value < bands.plausibleMin || value > bands.plausibleMax) return "unlikely";
	return "plausible";
}

/** The soft warning, exactly as `ubuntu-copy.md` §4 writes it. Do not improve it. */
export const UNLIKELY_WARNING =
	"That's outside what we usually see. Check it if you can — and if it's right, leave it. He'll see it before anything is cut.";
