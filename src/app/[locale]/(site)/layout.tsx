import SiteFooter from "@/components/site-footer";
import SiteNav from "@/components/site-nav";
import { content } from "@/content";
import { toLocale } from "@/lib/locale";

/**
 * The public shell: nav above, footer below, one page between them.
 *
 * **A route group, because the holding page must not have either.** `/holding`
 * is what the gate rewrites to before launch *(see `src/lib/routing.ts`)*, and a
 * pre-launch page with a working nav would walk a stranger straight into the site
 * the gate is holding shut. The group keeps the shell off it without changing a
 * single URL.
 *
 * Unstyled. Phase 5 is design and Phase 6 is motion; both need this structure to
 * exist before they have anything to work on.
 */
export default async function SiteLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}) {
	const { locale: segment } = await params;
	const locale = toLocale(segment);
	const copy = content(locale);

	return (
		<>
			<SiteNav locale={locale} copy={copy} />
			{children}
			<SiteFooter locale={locale} copy={copy} />
		</>
	);
}
