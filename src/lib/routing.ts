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
