import { isGated } from "./gate";
import { hasLocalePrefix, localeFromPath } from "./locale";

export type RouteDecision =
	// Pass the request through to the route that matches it.
	| { kind: "next" }
	// Serve a different route without changing the visible URL.
	| { kind: "rewrite"; to: string };

/**
 * What the middleware should do with a request, as a pure function of the path
 * and whether the site is open — so every open/shut × path combination is
 * testable without a request or the Worker env.
 *
 * Two jobs, in order:
 *  1. If the site is shut and the path is gated, serve that locale's holding
 *     page.
 *  2. Otherwise, a public path that carries no locale prefix is served from
 *     /en. Order links, the dashboard and the API are not gated and never get
 *     a locale — they stay outside the locale tree.
 *
 * Only ever a rewrite or a pass, never a redirect: the address bar keeps the
 * requested path and never gains /en.
 */
export function resolveRoute(pathname: string, open: boolean): RouteDecision {
	const locale = localeFromPath(pathname);

	if (!open && isGated(pathname)) {
		return { kind: "rewrite", to: `/${locale}/holding` };
	}

	if (isGated(pathname) && !hasLocalePrefix(pathname)) {
		return { kind: "rewrite", to: pathname === "/" ? "/en" : `/en${pathname}` };
	}

	return { kind: "next" };
}

/**
 * True for the order tree — `/o` and everything beneath it.
 *
 * `/o/<token>`, its `I've paid` POST, and the private photo stream all live
 * here, and all three must carry the same two headers. Written as a prefix test
 * rather than as a matcher pattern so it can be tested directly, and so
 * `/optional` is not an order route.
 */
export function isOrderRoute(pathname: string): boolean {
	return pathname === "/o" || pathname.startsWith("/o/");
}

/**
 * The two headers every order route answers with *(R5)*.
 *
 * **`Referrer-Policy: no-referrer`, because the path is the credential.** Any
 * link off this page — and any image, stylesheet or font it loads from
 * elsewhere — would otherwise send the full URL, token and all, to whoever is
 * on the other end. It is one header standing between a live order link and a
 * third party's access log.
 *
 * **`X-Robots-Tag: noindex, nofollow`** beside the metadata block on the page
 * itself, because a header covers what a `<meta>` tag cannot: the photo stream
 * is not HTML and has no `<head>` to put one in.
 */
export const ORDER_ROUTE_HEADERS: Record<string, string> = {
	"Referrer-Policy": "no-referrer",
	"X-Robots-Tag": "noindex, nofollow",
};
