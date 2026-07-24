import type { Locale } from "@/lib/locale";
import { en, type Content, type Translation } from "./en";
import { rw } from "./rw";

// English is the source and carries no overlay; other locales overlay onto it.
const OVERLAYS: Record<Locale, Translation | null> = {
	en: null,
	rw,
};

/**
 * The copy for a locale: the translated value for each key the founder has
 * written, the English value everywhere else. A missing translation is null
 * and falls back silently — a page always renders, never blocked on a
 * translation.
 */
export function content(locale: Locale): Content {
	return resolve(en, OVERLAYS[locale]);
}

/**
 * Overlay a translation onto the English source. A non-null translated value
 * wins; null (not written yet) falls back to English. Exported so the
 * where-present / otherwise-English behaviour is testable directly.
 *
 * Written key-by-key on purpose: the return type is Content, so a key added to
 * `en` breaks this build until it is handled here too — a second guard, beside
 * the Translation type, against a new string slipping through untranslated.
 */
export function resolve(base: Content, overlay: Translation | null): Content {
	if (!overlay) return base;
	return {
		title: overlay.title ?? base.title,
		wordmark: overlay.wordmark ?? base.wordmark,
		line: overlay.line ?? base.line,
		handles: overlay.handles ?? base.handles,
	};
}
