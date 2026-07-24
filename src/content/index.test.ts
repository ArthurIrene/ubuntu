import { describe, expect, it } from "vitest";
import { content, resolve } from "./index";
import { en, type Translation } from "./en";

describe("content", () => {
	it("returns the English source for the English locale", () => {
		expect(content("en")).toEqual(en);
	});

	it("falls back to English for every key not yet translated", () => {
		// rw.ts is entirely null today, so Kinyarwanda resolves to English.
		expect(content("rw")).toEqual(en);
	});

	it("never yields a null or undefined value", () => {
		for (const value of Object.values(content("rw"))) {
			expect(value).not.toBeNull();
			expect(value).not.toBeUndefined();
		}
	});
});

describe("resolve", () => {
	it("takes the translation where present and English where null", () => {
		const overlay: Translation = {
			title: null,
			wordmark: "Ubuntu",
			line: null,
			handles: ["@one", "@two"],
		};
		const out = resolve(en, overlay);

		// present → translated
		expect(out.wordmark).toBe("Ubuntu");
		expect(out.handles).toEqual(["@one", "@two"]);
		// null → English fallback
		expect(out.title).toBe(en.title);
		expect(out.line).toBe(en.line);
	});

	it("does not mutate the English source", () => {
		const before = { ...en };
		resolve(en, { title: "x", wordmark: "y", line: "z", handles: ["a"] });
		expect(en).toEqual(before);
	});
});
