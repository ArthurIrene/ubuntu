import { describe, expect, it } from "vitest";
import { LOCALES } from "./locale";
import { path, piecePath, ROUTES, type RouteKey } from "./routes";
import { resolveRoute } from "./routing";

const KEYS = Object.keys(ROUTES) as RouteKey[];

describe("path", () => {
	it("leaves English unprefixed", () => {
		expect(path("en", "home")).toBe("/");
		expect(path("en", "collection")).toBe("/collection");
		expect(path("en", "commissions")).toBe("/commissions");
	});

	it("mirrors every route under /rw", () => {
		for (const key of KEYS) {
			expect(path("rw", key)).toBe(key === "home" ? "/rw" : `/rw${ROUTES[key]}`);
		}
	});

	it("keeps the label and the route apart on the one route where they differ", () => {
		// The label a customer reads is *Only yours*; the route is /commissions,
		// because *only-yours* is a poor slug and a worse link to paste into a
		// message. The label lives in src/content/ and never here.
		expect(ROUTES.commissions).toBe("/commissions");
	});

	it("has no /new", () => {
		// The collection page sorts newest-first and is the permanent answer to
		// what's new. A second route would be the same page with a different
		// heading, and it would have to be maintained.
		expect(Object.values(ROUTES)).not.toContain("/new");
	});

	it("puts a piece beneath its collection, in both trees", () => {
		expect(piecePath("en", "fishing-shorts")).toBe("/collection/fishing-shorts");
		expect(piecePath("rw", "fishing-shorts")).toBe("/rw/collection/fishing-shorts");
	});
});

describe("every public route, through the middleware", () => {
	// The mirror is only walkable if the middleware agrees with the route table:
	// an English path is served from /en without the address bar gaining it, and a
	// /rw path passes through untouched.
	it("serves the English tree from /en without a redirect", () => {
		for (const key of KEYS) {
			const requested = path("en", key);
			expect(resolveRoute(requested, true)).toEqual({
				kind: "rewrite",
				to: key === "home" ? "/en" : `/en${ROUTES[key]}`,
			});
		}
	});

	it("passes the Kinyarwanda tree straight through", () => {
		for (const key of KEYS) {
			expect(resolveRoute(path("rw", key), true)).toEqual({ kind: "next" });
		}
	});

	it("holds every public route behind the gate while the site is shut", () => {
		for (const locale of LOCALES) {
			for (const key of KEYS) {
				expect(resolveRoute(path(locale, key), false)).toEqual({
					kind: "rewrite",
					to: `/${locale}/holding`,
				});
			}
		}
	});
});
