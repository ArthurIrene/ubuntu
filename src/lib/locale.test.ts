import { describe, expect, it } from "vitest";
import { hasLocalePrefix, localeFromPath, toLocale } from "./locale";

describe("localeFromPath", () => {
	it("reads /rw and its subtree as Kinyarwanda", () => {
		expect(localeFromPath("/rw")).toBe("rw");
		expect(localeFromPath("/rw/collection")).toBe("rw");
	});

	it("reads everything else as English", () => {
		expect(localeFromPath("/")).toBe("en");
		expect(localeFromPath("/collection")).toBe("en");
	});

	it("does not mistake a shared prefix boundary for the locale", () => {
		// "/rwanda" is an English page, not the Kinyarwanda tree.
		expect(localeFromPath("/rwanda")).toBe("en");
	});
});

describe("hasLocalePrefix", () => {
	it("is true for a locale segment or its subtree", () => {
		expect(hasLocalePrefix("/rw")).toBe(true);
		expect(hasLocalePrefix("/rw/collection")).toBe(true);
		expect(hasLocalePrefix("/en")).toBe(true);
		expect(hasLocalePrefix("/en/collection")).toBe(true);
	});

	it("is false for an unprefixed path", () => {
		expect(hasLocalePrefix("/")).toBe(false);
		expect(hasLocalePrefix("/collection")).toBe(false);
	});

	it("does not mistake a shared prefix boundary for a locale segment", () => {
		expect(hasLocalePrefix("/rwanda")).toBe(false);
		expect(hasLocalePrefix("/english")).toBe(false);
	});
});

describe("toLocale", () => {
	it("maps rw to rw and everything else to en", () => {
		expect(toLocale("rw")).toBe("rw");
		expect(toLocale("en")).toBe("en");
		expect(toLocale("fr")).toBe("en");
	});
});
