import { describe, expect, it } from "vitest";

import { ageAtOrder, evaluateFit, fitSource, nativeBounds, type BandSpec } from "./fit";

// The three bands are the whole of R7's guardrail decision, and the record they
// produce is what the policy's three-way liability clause is adjudicated
// against. These are the tests that say what the form is allowed to do to a
// real body.

/** Chest, in millimetres: plausible 70–130cm, impossible 40–200cm. */
const CHEST: BandSpec = {
	measurementKey: "chest",
	required: true,
	position: 0,
	plausibleMin: 700,
	plausibleMax: 1300,
	impossibleMin: 400,
	impossibleMax: 2000,
};

const HEIGHT: BandSpec = {
	measurementKey: "height",
	required: false,
	position: 1,
	plausibleMin: 1400,
	plausibleMax: 2000,
	impossibleMin: 500,
	impossibleMax: 2500,
};

const run = (typed: Record<string, string>, specs: BandSpec[] = [CHEST]) =>
	evaluateFit({ specs, typed, unit: "cm" });

describe("the three bands", () => {
	it("passes a plausible number silently", () => {
		const outcome = run({ chest: "96" });
		expect(outcome.ok).toBe(true);
		if (!outcome.ok) return;
		expect(outcome.rows[0].warned).toBe(false);
		expect(outcome.rows[0].value).toBe(960);
	});

	it("warns rather than refusing outside plausible", () => {
		// **A hard block on a real body is the site telling someone their body is
		// wrong.** 135cm is unusual and it is somebody.
		const outcome = run({ chest: "135" });
		expect(outcome.ok).toBe(true);
		if (!outcome.ok) return;
		expect(outcome.rows[0].warned).toBe(true);
	});

	it("refuses only outside impossible", () => {
		const outcome = run({ chest: "210" });
		expect(outcome.ok).toBe(false);
		if (outcome.ok) return;
		expect(outcome.refusals).toEqual([{ kind: "impossible", key: "chest", label: "Chest" }]);
	});

	it("treats both band edges as inside", () => {
		// The bands nest and the boundaries are inclusive, which is what lets the
		// native min/max on the input agree with the server exactly.
		expect(run({ chest: "70" }).ok).toBe(true);
		expect(run({ chest: "130" }).ok).toBe(true);
		expect(run({ chest: "40" }).ok).toBe(true);
		expect(run({ chest: "200" }).ok).toBe(true);
		expect(run({ chest: "39.9" }).ok).toBe(false);
		expect(run({ chest: "200.1" }).ok).toBe(false);
	});
});

describe("what gets written", () => {
	it("snapshots the label, the instruction and the ranges in force", () => {
		// Self-contained on purpose *(R7)*: without the instruction and the version
		// the shared-liability clause cannot be adjudicated at all.
		const outcome = run({ chest: "96" });
		if (!outcome.ok) throw new Error("expected rows");
		const row = outcome.rows[0];

		expect(row.label).toBe("Chest");
		expect(row.instruction).toMatch(/fullest part of the chest/);
		expect(row.plausibleMin).toBe(700);
		expect(row.impossibleMax).toBe(2000);
	});

	it("stores millimetres as integers", () => {
		// The same discipline as money. A body measurement that has been through a
		// float is one that can come back different.
		const outcome = run({ chest: "96.4" });
		if (!outcome.ok) throw new Error("expected rows");
		expect(Number.isInteger(outcome.rows[0].value)).toBe(true);
		expect(outcome.rows[0].value).toBe(964);
	});

	it("writes nothing at all when one number is refused", () => {
		// A fit record missing the one number that was wrong reads as though the
		// question was never asked.
		const outcome = evaluateFit({
			specs: [CHEST, HEIGHT],
			typed: { chest: "96", height: "9999" },
			unit: "cm",
		});
		expect(outcome.ok).toBe(false);
	});

	it("keeps his order on the form", () => {
		// **A kids type leads with height** *(R13c)*, which is a property of this
		// list and needed no new schema.
		const outcome = evaluateFit({
			specs: [{ ...HEIGHT, position: 0 }, { ...CHEST, position: 1 }],
			typed: { chest: "96", height: "170" },
			unit: "cm",
		});
		if (!outcome.ok) throw new Error("expected rows");
		expect(outcome.rows.map((row) => row.measurementKey)).toEqual(["height", "chest"]);
	});
});

describe("what a person actually types", () => {
	it("reads a comma decimal and stray spaces", () => {
		// Half the world writes 96,5. Refusing it is the form telling someone their
		// keyboard is wrong.
		expect(run({ chest: " 96,5 " }).ok).toBe(true);
	});

	it("asks again for a required answer that is missing", () => {
		const outcome = run({});
		expect(outcome.ok).toBe(false);
		if (outcome.ok) return;
		expect(outcome.refusals[0].kind).toBe("missing");
	});

	it("lets an optional one be left blank", () => {
		const outcome = evaluateFit({ specs: [HEIGHT], typed: {}, unit: "cm" });
		expect(outcome.ok).toBe(true);
		if (!outcome.ok) return;
		expect(outcome.rows).toHaveLength(0);
	});

	it("names an answer it cannot read as different from one not given", () => {
		const outcome = run({ chest: "about a metre" });
		expect(outcome.ok).toBe(false);
		if (outcome.ok) return;
		expect(outcome.refusals[0].kind).toBe("unreadable");
	});

	it("ignores a measurement key with no definition in code", () => {
		// Definitions in code, ranges in the dashboard *(R7)* — he cannot invent a
		// measurement with nowhere to render on the drawing.
		const outcome = evaluateFit({
			specs: [{ ...CHEST, measurementKey: "wingspan" }],
			typed: { wingspan: "180" },
			unit: "cm",
		});
		expect(outcome.ok).toBe(true);
		if (!outcome.ok) return;
		expect(outcome.rows).toHaveLength(0);
	});
});

describe("source decides liability", () => {
	it("makes a size standard, whatever else was ticked", () => {
		expect(fitSource("size", "guardian")).toBe("standard");
	});

	it("records measuring someone else as guardian, never as self", () => {
		// Reusing `self` gets liability right and the record wrong *(R13a)*.
		expect(fitSource("measurements", "guardian")).toBe("guardian");
	});

	it("keeps self and tailor apart", () => {
		expect(fitSource("measurements", "self")).toBe("self");
		expect(fitSource("measurements", "tailor")).toBe("tailor");
	});

	it("cannot reach ours from a public form", () => {
		// `ours` means measured at a physical point by us — fully his, no
		// negotiation. Only the dashboard may assert it, because only he was there.
		const reachable = ["self", "guardian", "tailor", "standard", "ours", "", "nonsense"].map(
			(who) => fitSource("measurements", who),
		);
		expect(reachable).not.toContain("ours");
	});
});

describe("age at order", () => {
	it("takes a plain number of years", () => {
		expect(ageAtOrder("7")).toBe(7);
	});

	it("refuses anything that is not one", () => {
		// **Never a date of birth** *(R13a)*: a birth date ages by itself and
		// identifies. There is no path here that accepts one.
		expect(ageAtOrder("2019-04-11")).toBeNull();
		expect(ageAtOrder("7.5")).toBeNull();
		expect(ageAtOrder("-1")).toBeNull();
		expect(ageAtOrder("")).toBeNull();
	});
});

describe("the bounds a browser enforces", () => {
	it("offers the impossible band and never the plausible one", () => {
		// A browser cannot ask a question, and turning *unusual* into *invalid* is
		// the hard block on a real body that R7 refused.
		expect(nativeBounds(CHEST, "cm")).toEqual({ min: 40, max: 200, step: 0.1 });
	});

	it("reads a weight in kilograms", () => {
		expect(
			nativeBounds(
				{ measurementKey: "weight", impossibleMin: 2000, impossibleMax: 250_000 },
				"cm",
			),
		).toEqual({ min: 2, max: 250, step: 0.1 });
	});
});
