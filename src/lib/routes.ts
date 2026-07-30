// Every public route, and the one function that writes a link to it.
//
// **The mirroring lives here, not in the pages.** English is unprefixed and
// Kinyarwanda sits under `/rw` *(R14)*, so a hand-written `href="/collection"`
// inside the Kinyarwanda tree walks the reader silently back into English. One
// helper takes the locale it is already holding and there is no second way to
// write a link.
//
// The middleware rewrites `/` to `/en` without touching the address bar, so the
// English hrefs here are the paths a customer sees.

import type { Locale } from "./locale";

/**
 * The public URL set, as decided in R10.
 *
 * **A route name and a nav label may differ, and `commissions` is the only case
 * on the site.** The route stays `/commissions` because *only-yours* is a poor
 * slug and a worse link to paste into a message; the label a customer reads is
 * *Only yours*, and it lives in `src/content/` with every other string.
 *
 * `story` is `/our-story`, which matches its label. R10 forced the rest of the
 * set and left the story page's own slug unwritten; `/the-making` set the
 * pattern for a definite article, and the label is *Our story*, so anything else
 * would be a second route-versus-label split — the exact thing R10 confined to
 * one case.
 */
export const ROUTES = {
	home: "",
	collection: "/collection",
	commissions: "/commissions",
	making: "/the-making",
	story: "/our-story",
	contact: "/contact",
	policies: "/policies",
} as const;

export type RouteKey = keyof typeof ROUTES;

/**
 * The path for a route in a locale. `/collection` in English, `/rw/collection`
 * in Kinyarwanda.
 *
 * English is unprefixed, so the home path is `/` rather than the empty string
 * the table holds.
 */
export function path(locale: Locale, route: RouteKey): string {
	const prefix = locale === "en" ? "" : `/${locale}`;
	return `${prefix}${ROUTES[route]}` || "/";
}

/**
 * A piece's page: the slug beneath `/collection`.
 *
 * One place, so the collection card, the window display and the ritual door
 * cannot drift apart — and so the day a piece URL changes it changes once.
 */
export function piecePath(locale: Locale, slug: string): string {
	return `${path(locale, "collection")}/${slug}`;
}
