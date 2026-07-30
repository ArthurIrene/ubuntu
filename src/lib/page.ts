// What every public page needs before it renders anything: which locale it is
// in, and the copy resolved for that locale.
//
// One helper rather than four lines at the top of nine files — and the reason it
// exists is the fallback. `content(locale)` is where a missing Kinyarwanda string
// silently becomes English, so a page that resolved its own copy by hand is a
// page that could forget to.

import { content } from "@/content";
import type { Content } from "@/content/en";
import { toLocale, type Locale } from "@/lib/locale";

export interface PageContext {
	locale: Locale;
	copy: Content;
}

/**
 * The locale segment narrowed, and the copy for it.
 *
 * Only `en` and `rw` exist; anything else narrows to English rather than
 * throwing, because the locale layout has already 404ed an unknown segment
 * before a page runs.
 */
export async function pageContext(params: Promise<{ locale: string }>): Promise<PageContext> {
	const { locale } = await params;
	const resolved = toLocale(locale);
	return { locale: resolved, copy: content(resolved) };
}
