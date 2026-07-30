import type { Locale } from "@/lib/locale";
import { en, type Content, type Translatable, type Translation } from "./en";
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
 * **The guard against an untranslated string is the type, not this function.**
 * `Translation` names every key of `Content` at every depth, so a key added to
 * `en` breaks the build until `rw.ts` names it too — which is what the earlier
 * key-by-key version of this function was for, and what stopped scaling at
 * about the twentieth string. The walk is generic; the discipline is in `en.ts`.
 *
 * Arrays are leaves: a list of three lines is translated whole or not at all.
 * Half of a list in one language and half in another is not a fallback, it is a
 * mess, and it is the one shape a per-key walk would happily produce.
 */
export function resolve<T extends object>(base: T, overlay: Translatable<T> | null): T {
	if (!overlay) return base;

	const out = {} as Record<string, unknown>;
	for (const key of Object.keys(base) as (keyof T & string)[]) {
		const source = base[key];
		const translated = (overlay as Record<string, unknown>)[key];

		if (source !== null && typeof source === "object" && !Array.isArray(source)) {
			// A namespace. Walk into it; nothing at this level is ever a value.
			out[key] = resolve(
				source as unknown as object,
				translated as Translatable<object> | null,
			);
		} else {
			// A string or a list — a leaf. Translated where written, English where not.
			out[key] = translated ?? source;
		}
	}
	return out as T;
}

/**
 * A keyed string with its `{placeholders}` filled.
 *
 * The values are computed — days from a piece's making days plus the global
 * queue offset, a fee from Settings — and the sentence around them is a key in
 * both locales, so a number can be substituted without a string being built by
 * concatenation at a call site.
 *
 * An unanswered value arrives here already rendered as `[X]` by its caller;
 * this does not invent one.
 */
export function fill(template: string, vars: Record<string, string>): string {
	return template.replace(/\{(\w+)\}/g, (whole, name: string) => vars[name] ?? whole);
}
