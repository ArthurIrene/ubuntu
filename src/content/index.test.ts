import { describe, expect, it } from "vitest";
import { content, fill, resolve } from "./index";
import { en } from "./en";
import { rw } from "./rw";

/** Every leaf in a resolved tree, so a fallback can be checked at any depth. */
function leaves(value: unknown, path = ""): [string, unknown][] {
	if (value !== null && typeof value === "object" && !Array.isArray(value)) {
		return Object.entries(value).flatMap(([key, child]) =>
			leaves(child, path ? `${path}.${key}` : key),
		);
	}
	return [[path, value]];
}

describe("content", () => {
	it("returns the English source for the English locale", () => {
		expect(content("en")).toEqual(en);
	});

	it("falls back to English for every key not yet translated", () => {
		// rw.ts was entirely null until the fit fork landed. The three guardrail
		// strings are the first real Kinyarwanda on the site — deliberately, because
		// falling back to English on those two sentences is worse than falling back
		// anywhere else: they are what a customer reads at the moment the form
		// questions a number about their own body. Everything else still resolves
		// to English, and this asserts exactly that.
		const translated = leaves(rw)
			.filter(([, value]) => value !== null)
			.map(([key]) => key);

		expect(translated).toEqual([
			"order.fit.impossible",
			"order.fit.implausible",
			"order.fit.acknowledge",
		]);

		for (const [key, value] of leaves(content("rw"))) {
			if (translated.includes(key)) continue;
			expect(value, key).toEqual(new Map(leaves(en)).get(key));
		}
	});

	it("never yields a null or undefined value, at any depth", () => {
		for (const [key, value] of leaves(content("rw"))) {
			expect(value, key).not.toBeNull();
			expect(value, key).not.toBeUndefined();
		}
	});

	it("names every English key in the Kinyarwanda overlay", () => {
		// The type already enforces this; the test says out loud what it enforces,
		// because it is the guard against a new string shipping untranslatable.
		expect(leaves(rw).map(([key]) => key)).toEqual(leaves(en).map(([key]) => key));
	});
});

describe("resolve", () => {
	it("takes the translation where present and English where null", () => {
		const out = resolve(en, {
			...rw,
			wordmark: "Ubuntu",
			handles: ["@one", "@two"],
		});

		// present → translated
		expect(out.wordmark).toBe("Ubuntu");
		expect(out.handles).toEqual(["@one", "@two"]);
		// null → English fallback
		expect(out.title).toBe(en.title);
		expect(out.line).toBe(en.line);
	});

	it("walks into a namespace, key by key", () => {
		const out = resolve(en, {
			...rw,
			nav: { ...rw.nav, collection: "Ibyacurujwe" },
		});

		expect(out.nav.collection).toBe("Ibyacurujwe");
		// A translated sibling does not drag the rest of the namespace with it.
		expect(out.nav.making).toBe(en.nav.making);
	});

	it("treats a list as one leaf, translated whole or not at all", () => {
		const three = ["ya mbere", "ya kabiri", "ya gatatu"];
		const out = resolve(en, { ...rw, piece: { ...rw.piece, beneathButton: three } });

		expect(out.piece.beneathButton).toEqual(three);
		expect(resolve(en, rw).piece.beneathButton).toEqual(en.piece.beneathButton);
	});

	it("does not mutate the English source", () => {
		const before = JSON.stringify(en);
		resolve(en, { ...rw, wordmark: "Ubuntu", nav: { ...rw.nav, collection: "x" } });
		expect(JSON.stringify(en)).toBe(before);
	});
});

describe("fill", () => {
	it("substitutes a named value", () => {
		expect(fill("about {days} days", { days: "12" })).toBe("about 12 days");
	});

	it("leaves a placeholder it was given nothing for", () => {
		// A missing value must not silently become "undefined" in front of a
		// customer. The visible placeholder is the bug he can see.
		expect(fill("costs {fee}", {})).toBe("costs {fee}");
	});
});
