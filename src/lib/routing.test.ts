import { describe, expect, it } from "vitest";
import { resolveRoute } from "./routing";

// The combinations that matter are the gate crossed with the locale, not each
// alone. These are those crossings.
describe("resolveRoute — shut", () => {
	it("serves the English holding page at the root", () => {
		expect(resolveRoute("/", false)).toEqual({
			kind: "rewrite",
			to: "/en/holding",
		});
	});

	it("serves the Kinyarwanda holding page under /rw", () => {
		expect(resolveRoute("/rw", false)).toEqual({
			kind: "rewrite",
			to: "/rw/holding",
		});
	});

	it("serves a deep Kinyarwanda path its own holding page", () => {
		expect(resolveRoute("/rw/collection", false)).toEqual({
			kind: "rewrite",
			to: "/rw/holding",
		});
	});

	it("never gates an order link and never gives it a locale", () => {
		expect(resolveRoute("/o/deadbeefcafe0123", false)).toEqual({ kind: "next" });
	});

	it("leaves the dashboard reachable and unlocaled while shut", () => {
		expect(resolveRoute("/dashboard", false)).toEqual({ kind: "next" });
	});
});

describe("resolveRoute — open", () => {
	it("serves the root from /en without changing the address", () => {
		expect(resolveRoute("/", true)).toEqual({ kind: "rewrite", to: "/en" });
	});

	it("serves a public English path from /en", () => {
		expect(resolveRoute("/collection", true)).toEqual({
			kind: "rewrite",
			to: "/en/collection",
		});
	});

	it("passes /rw through — it is already prefixed", () => {
		expect(resolveRoute("/rw", true)).toEqual({ kind: "next" });
	});

	it("passes a deep /rw path through", () => {
		expect(resolveRoute("/rw/collection", true)).toEqual({ kind: "next" });
	});

	it("passes an order link through untouched", () => {
		expect(resolveRoute("/o/deadbeefcafe0123", true)).toEqual({ kind: "next" });
	});
});

describe("resolveRoute is never a redirect", () => {
	const paths = [
		"/",
		"/collection",
		"/rw",
		"/rw/collection",
		"/o/deadbeefcafe0123",
		"/dashboard",
		"/api/upload",
		"/en",
		"/en/collection",
	];

	for (const open of [false, true]) {
		for (const pathname of paths) {
			it(`${open ? "open" : "shut"} ${pathname} → rewrite or pass, never redirect`, () => {
				const decision = resolveRoute(pathname, open);
				// The decision type has no redirect arm, so the address bar can
				// never gain /en: /en is only ever an internal rewrite target,
				// reached with a 200 that keeps the requested URL.
				expect(["next", "rewrite"]).toContain(decision.kind);
			});
		}
	}
});
