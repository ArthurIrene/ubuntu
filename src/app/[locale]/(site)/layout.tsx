import SiteFooter from "@/components/site-footer";
import SiteNav from "@/components/site-nav";
import { content } from "@/content";
import { toLocale } from "@/lib/locale";
import { path } from "@/lib/routes";

/**
 * The public shell: nav above, footer below, one page between them.
 *
 * **A route group, because the holding page must not have either.** `/holding`
 * is what the gate rewrites to before launch *(see `src/lib/routing.ts`)*, and a
 * pre-launch page with a working nav would walk a stranger straight into the site
 * the gate is holding shut. The group keeps the shell off it without changing a
 * single URL.
 *
 * The nav's four items are built here rather than inside `SiteNav`, which is a
 * Client Component: its props cross into the browser payload, so it is handed
 * four hrefs and four labels instead of the whole of `src/content`.
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

	/**
	 * **Four items, and no hamburger** *(R10)*. `/contact` is deliberately absent
	 * — it lives in the footer, because a contact link in the nav is the thing
	 * that quietly competes with the order form.
	 *
	 * The second one is **the one place on the site where the label and the route
	 * differ**: the route is `/commissions`, because *only-yours* is a poor slug
	 * and a worse link to paste into a message; the label a customer reads is
	 * *Only yours*.
	 */
	const items = [
		{ href: path(locale, "collection"), label: copy.nav.collection },
		{ href: path(locale, "commissions"), label: copy.nav.commissions },
		{ href: path(locale, "making"), label: copy.nav.making },
		{ href: path(locale, "story"), label: copy.nav.story },
	];

	return (
		// A column so the footer sits at the foot of a short page rather than
		// halfway up it — the order page after a redirect is the short one.
		<div className="flex min-h-dvh flex-col">
			<SiteNav
				home={path(locale, "home")}
				wordmark={copy.wordmark}
				navLabel={copy.nav.label}
				items={items}
			/>
			<div className="flex-1">{children}</div>
			<SiteFooter locale={locale} copy={copy} />
		</div>
	);
}
