import { describe, expect, it } from "vitest";
import { isGated, isOpen } from "./gate";

describe("isOpen", () => {
	it("is true only for exactly \"open\"", () => {
		expect(isOpen("open")).toBe(true);
	});

	it("is false when unset or empty", () => {
		expect(isOpen(undefined)).toBe(false);
		expect(isOpen("")).toBe(false);
	});

	it("is false for near misses — the 11pm typos", () => {
		expect(isOpen("true")).toBe(false);
		expect(isOpen("1")).toBe(false);
		expect(isOpen("OPEN")).toBe(false);
		expect(isOpen("Open")).toBe(false);
		expect(isOpen(" open")).toBe(false);
		expect(isOpen("open ")).toBe(false);
		expect(isOpen("closed")).toBe(false);
	});
});

describe("isGated", () => {
	it("gates the public tree", () => {
		expect(isGated("/")).toBe(true);
		expect(isGated("/collection")).toBe(true);
		expect(isGated("/commissions")).toBe(true);
		expect(isGated("/the-making")).toBe(true);
		expect(isGated("/rw")).toBe(true);
		expect(isGated("/rw/collection")).toBe(true);
	});

	it("never gates order links — a real token reaches its page", () => {
		expect(isGated("/o")).toBe(false);
		expect(isGated("/o/")).toBe(false);
		expect(isGated("/o/deadbeefcafe0123")).toBe(false);
	});

	it("never gates the dashboard", () => {
		expect(isGated("/dashboard")).toBe(false);
		expect(isGated("/dashboard/orders")).toBe(false);
	});

	it("never gates the api, the holding page, or Next internals", () => {
		expect(isGated("/api")).toBe(false);
		expect(isGated("/api/upload")).toBe(false);
		expect(isGated("/holding")).toBe(false);
		expect(isGated("/_next")).toBe(false);
		expect(isGated("/_next/data/build/x.json")).toBe(false);
	});

	it("gates paths that merely share a prefix boundary", () => {
		// "/o" is exempt but "/optional" is a public page, not an order link.
		expect(isGated("/optional")).toBe(true);
		expect(isGated("/orders")).toBe(true);
	});
});
