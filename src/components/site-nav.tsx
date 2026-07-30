import Link from "next/link";

import type { Content } from "@/content/en";
import type { Locale } from "@/lib/locale";
import { path, type RouteKey } from "@/lib/routes";

/**
 * **Four items, and no hamburger** *(R10)*.
 *
 * Four fit across a phone, and a menu that has to be opened costs the click that
 * gets someone into the story. Policies and Talk to us are in the footer;
 * `/contact` is deliberately not here, because a contact link in the nav is what
 * quietly competes with the order form.
 *
 * Revisited in Phase 5 against real Kinyarwanda labels, which run about 30%
 * longer — which is why the labels are keyed and this component holds none.
 *
 * No styling. Phase 5 designs it; Phase 6 gives it the one persistent nav stitch
 * that sews itself between items. Both need this markup to exist first.
 */
const ITEMS: { route: RouteKey; label: (copy: Content) => string }[] = [
	{ route: "collection", label: (copy) => copy.nav.collection },
	// The label is *Only yours*; the route is `/commissions`.
	{ route: "commissions", label: (copy) => copy.nav.commissions },
	{ route: "making", label: (copy) => copy.nav.making },
	{ route: "story", label: (copy) => copy.nav.story },
];

export default function SiteNav({ locale, copy }: { locale: Locale; copy: Content }) {
	return (
		<header>
			<Link href={path(locale, "home")}>{copy.wordmark}</Link>
			<nav aria-label={copy.nav.home}>
				<ul>
					{ITEMS.map((item) => (
						<li key={item.route}>
							<Link href={path(locale, item.route)}>{item.label(copy)}</Link>
						</li>
					))}
				</ul>
			</nav>
		</header>
	);
}
