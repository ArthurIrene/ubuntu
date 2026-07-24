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
