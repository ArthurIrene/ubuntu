// The two locales. English is canonical and unprefixed; Kinyarwanda lives
// under /rw, built and walkable but unlinked until the switcher flips.

export const LOCALES = ["en", "rw"] as const;
export type Locale = (typeof LOCALES)[number];

/**
 * The locale a request path belongs to. A path is Kinyarwanda only when it is
 * exactly "/rw" or continues with "/rw/" — so "/rwanda" is English, not a typo
 * that leaks the wrong tree.
 */
export function localeFromPath(pathname: string): Locale {
	return pathname === "/rw" || pathname.startsWith("/rw/") ? "rw" : "en";
}

/**
 * True when the path already names a locale segment. English is unprefixed, so
 * in practice only "/rw…" matches; "/en…" is covered too, so a hand-typed /en
 * URL is served rather than rewritten to /en/en.
 */
export function hasLocalePrefix(pathname: string): boolean {
	return LOCALES.some(
		(locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
	);
}

/**
 * A route-param segment ("en" | "rw" | anything) narrowed to a Locale. Only
 * "rw" is Kinyarwanda; everything else resolves to English.
 */
export function toLocale(value: string): Locale {
	return value === "rw" ? "rw" : "en";
}

/**
 * A path as the address bar shows it, from a path as the app router sees it.
 *
 * **The middleware rewrites "/" to "/en" without touching the URL** *(R14)*, so
 * a server render — and a static prerender — sees `/en/the-making` where the
 * browser will see `/the-making`. Anything comparing a real path against a link
 * built by `path()` has to reconcile the two, or the server and the client
 * disagree about which page the reader is on: the nav's stitch lands under
 * nothing in the HTML and then jumps into place at hydration.
 *
 * Kinyarwanda needs no reconciling — `/rw` is a real prefix a customer sees.
 */
export function publicPath(pathname: string): string {
	if (pathname === "/en") return "/";
	return pathname.startsWith("/en/") ? pathname.slice("/en".length) : pathname;
}
