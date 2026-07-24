import { beforeEach, describe, expect, it, vi } from "vitest";

// The Worker env, mutable per test. vi.hoisted so the mock factory (hoisted
// above the imports) can close over it safely.
const state = vi.hoisted(() => ({ publicSite: undefined as string | undefined }));

vi.mock("@opennextjs/cloudflare", () => ({
	getCloudflareContext: async () => ({ env: { PUBLIC_SITE: state.publicSite } }),
}));

import { NextRequest } from "next/server";
import { middleware } from "./middleware";

function request(pathname: string) {
	return new NextRequest(new URL(`https://ubuntu.rw${pathname}`));
}

// The internal rewrite target Next records, or null when the request passed
// through. Absolute, so read its pathname.
function rewriteTarget(res: Response): string | null {
	const header = res.headers.get("x-middleware-rewrite");
	return header ? new URL(header).pathname : null;
}

describe("middleware — shut", () => {
	beforeEach(() => {
		state.publicSite = undefined; // missing reads as shut
	});

	it("serves the English holding page at the root, as a 200 rewrite", async () => {
		const res = await middleware(request("/"));
		expect(res.status).toBe(200);
		expect(res.headers.get("location")).toBeNull();
		expect(rewriteTarget(res)).toBe("/en/holding");
	});

	it("serves the Kinyarwanda holding page under /rw", async () => {
		const res = await middleware(request("/rw"));
		expect(res.headers.get("location")).toBeNull();
		expect(rewriteTarget(res)).toBe("/rw/holding");
	});

	it("serves a deep /rw path its own holding page", async () => {
		const res = await middleware(request("/rw/collection"));
		expect(rewriteTarget(res)).toBe("/rw/holding");
	});

	it("passes an order link through — not gated, no locale prefix", async () => {
		const res = await middleware(request("/o/deadbeefcafe0123"));
		expect(rewriteTarget(res)).toBeNull();
		expect(res.headers.get("x-middleware-next")).not.toBeNull();
	});
});

describe("middleware — open", () => {
	beforeEach(() => {
		state.publicSite = "open";
	});

	it("serves the root from /en with no redirect and no Location", async () => {
		const res = await middleware(request("/"));
		expect(res.status).toBe(200);
		expect(res.headers.get("location")).toBeNull();
		expect(rewriteTarget(res)).toBe("/en");
	});

	it("passes /rw through unchanged", async () => {
		const res = await middleware(request("/rw"));
		expect(rewriteTarget(res)).toBeNull();
		expect(res.headers.get("x-middleware-next")).not.toBeNull();
	});
});

describe("no response is ever a redirect", () => {
	const paths = ["/", "/rw", "/rw/collection", "/collection", "/o/x", "/dashboard"];

	for (const publicSite of [undefined, "open"]) {
		for (const pathname of paths) {
			it(`${publicSite ? "open" : "shut"} ${pathname} keeps the URL (no 3xx, no Location)`, async () => {
				state.publicSite = publicSite;
				const res = await middleware(request(pathname));
				expect(res.status).toBeLessThan(300);
				expect(res.headers.get("location")).toBeNull();
			});
		}
	}
});
