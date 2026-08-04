import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FitFields } from "./fit-fields";
import { content } from "@/content";

/**
 * **The launch amendment, pinned down.**
 *
 * R7 urged measurements; the amendment reverses the emphasis so that *standard
 * sizing leads* and measurements are the invited second path. The decision
 * documents place that change in Phase 5, and it lands as three facts about this
 * component — the size path renders first, it is checked by default, and both
 * paths still ship in full.
 *
 * It is tested rather than eyeballed because **it could not be eyeballed.** No
 * live piece currently carries a `size` option group, so the leading path does
 * not render on the site at all (see the note in the round's hand-back). A
 * decision that cannot be seen in the running site is exactly the one that needs
 * a test holding it in place.
 *
 * Rendered with `react-dom/server` — no test renderer and no DOM, because React
 * is already a dependency and a string is enough to ask about order.
 */

const copy = content("en");

const SIZES = [
	{ key: "s", label: "S" },
	{ key: "m", label: "M" },
	{ key: "l", label: "L" },
];

const CHEST = {
	measurementKey: "chest",
	required: true,
	position: 10,
	plausibleMin: 700,
	plausibleMax: 1400,
	impossibleMin: 400,
	impossibleMax: 2000,
};

function render(props: Partial<Parameters<typeof FitFields>[0]> = {}) {
	return renderToStaticMarkup(
		<FitFields
			copy={copy.order.fit}
			pieceCopy={copy.piece}
			specs={[CHEST]}
			sizes={SIZES}
			audience="adult"
			{...props}
		/>,
	);
}

describe("the fit fork — standard sizing leads", () => {
	it("puts the size path before the measurement path", () => {
		const html = render();
		expect(html.indexOf("fit-path-size")).toBeGreaterThan(-1);
		expect(html.indexOf("fit-path-size")).toBeLessThan(html.indexOf("fit-path-measurements"));
	});

	it("checks the size path by default, and not the measurement path", () => {
		const html = render();
		// The attribute belongs to exactly one of the two fitPath radios.
		const size = html.slice(html.indexOf('id="fit-path-size"'));
		const measurements = html.slice(html.indexOf('id="fit-path-measurements"'));
		expect(size.slice(0, size.indexOf("/>"))).toContain("checked");
		expect(measurements.slice(0, measurements.indexOf("/>"))).not.toContain("checked");
	});

	it("still ships both paths in full — nothing is unbuilt", () => {
		const html = render();
		// Both prompts, both field sets, and the instruction beside the field.
		expect(html).toContain(copy.piece.fitForkSize);
		expect(html).toContain(copy.piece.fitForkMeasurements);
		expect(html).toContain('name="fitSize"');
		expect(html).toContain('name="m_chest"');
		// Height and weight are asked beside the size, because *he checks every
		// order himself against them* is a promise on the public page.
		expect(html).toContain('name="m_height"');
		expect(html).toContain('name="m_weight"');
	});

	it("falls back to the measurement path when a piece offers no sizes", () => {
		// He has not set a size option group on the piece. The fork must still
		// work rather than present an empty front door.
		const html = render({ sizes: [] });
		expect(html).not.toContain('id="fit-path-size"');
		const measurements = html.slice(html.indexOf('id="fit-path-measurements"'));
		expect(measurements.slice(0, measurements.indexOf("/>"))).toContain("checked");
	});

	it("asks nothing at all when the garment type is unconfigured", () => {
		// A real path, not a stub: he settles the numbers once he has confirmed
		// the piece, and the caller renders `order.form.fitLater` instead.
		expect(render({ specs: [], sizes: [] })).toBe("");
	});
});

describe("the fit fork — what it must never do", () => {
	it("carries the impossible band natively and never the unlikely one", () => {
		const html = render();
		// `min`/`max` are the impossible band. The unlikely band gets no
		// attribute: turning *unusual* into *invalid* is the hard block on a real
		// body that R7 refused.
		expect(html).toContain('min="40"');
		expect(html).toContain('max="200"');
		expect(html).not.toContain('min="70"');
		expect(html).not.toContain('max="140"');
	});

	it("renders no measurement value into anything a URL could carry", () => {
		// Keys only, never numbers *(R7, R11)*.
		const html = render({ refused: ["chest"] });
		expect(html).toContain(copy.order.fit.impossible);
	});

	it("asks a child's age only on a children's garment, and never a birthday", () => {
		expect(render({ audience: "adult" })).not.toContain('name="fitAge"');
		const kids = render({ audience: "kids" });
		expect(kids).toContain('name="fitAge"');
		expect(kids).not.toContain('type="date"');
	});
});
