"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { publicPath } from "@/lib/locale";

/**
 * **Four items, and no hamburger** *(R10)*.
 *
 * Four fit across a phone, and a menu that has to be opened costs the click that
 * gets someone into the story. Policies and Talk to us are in the footer;
 * `/contact` is deliberately not here, because a contact link in the nav is what
 * quietly competes with the order form.
 *
 * **Why this one file is a Client Component.** The nav carries a persistent wine
 * running stitch under the item you are on, and knowing which item that is means
 * knowing the path. The server-side way to learn it is a header set in
 * middleware and read with `headers()`, which would make the layout dynamic and
 * take `/policies`, `/the-making` and `/contact` off static prerendering — a
 * real cost, paid on every page, to underline a word. `usePathname` resolves
 * during the server render and during the static build, **so the stitch is in
 * the HTML and a reader with no JavaScript sees it in the right place.**
 *
 * It takes a flat list rather than the `Content` object it used to, because a
 * Client Component's props are serialised into the payload and the whole of
 * `src/content` does not need to travel to a browser to render four labels.
 *
 * Phase 6 owns the locked half of this: **one stitch that never blinks out**,
 * sewing itself between items as you navigate. What is here is the still
 * version, in the right place, with no transition on it.
 */
export interface NavItem {
	href: string;
	label: string;
}

export default function SiteNav({
	home,
	wordmark,
	navLabel,
	items,
}: {
	home: string;
	/** The script wordmark. A placeholder until the lettering artist's SVG *(§13.6)*. */
	wordmark: string;
	navLabel: string;
	items: NavItem[];
}) {
	/**
	 * `publicPath` because a server render sees the middleware's rewritten
	 * `/en/collection` while the browser sees `/collection`. Without it the
	 * server decides no item is current, the client decides one is, and the
	 * stitch appears only once JavaScript has run — which is exactly the thing
	 * this component was made a Client Component to avoid.
	 */
	const pathname = publicPath(usePathname() ?? "/");

	/**
	 * Prefix, not equality — a piece's own page sits beneath `/collection`, and
	 * the reader is still in the collection while they are reading one. Equality
	 * would drop the stitch on the deepest page of the section it belongs to.
	 */
	const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

	return (
		<header className="bg-cream text-ink">
			<div className="measure flex flex-wrap items-baseline justify-between gap-x-6 gap-y-4 pt-6 pb-2">
				<Link
					href={home}
					/*
					 * The one place the script appears besides the closing mark. Sized
					 * generously because Sacramento's x-height is small.
					 *
					 * **In ink, not on a wine ground.** Foundation §9 describes the logo
					 * as *"presented on a wine-dark ground"*, and §13 item 4 asks him
					 * whether that ground is an intentional brand colour or just the
					 * background of the file he sent. Until that is answered, the
					 * standing rule decides it: **wine is a thread, never a fill.** A
					 * wine chip behind the wordmark is the largest solid block of it on
					 * the page and the first thing a visitor sees.
					 */
					className="font-script text-3xl leading-none md:text-4xl"
				>
					{wordmark}
				</Link>

				<nav aria-label={navLabel}>
					{/*
					 * Wrapping rather than scrolling, and `gap-y` so that a wrapped row
					 * does not collide with the one above it. **Kinyarwanda runs ~30%
					 * longer** and this is the first place that shows: four English
					 * words may be five longer ones, and the fallback R10 named is a
					 * hamburger at `/rw` only — not a nav that overflows its line.
					 */}
					<ul className="flex flex-wrap items-baseline gap-x-5 gap-y-2 text-sm md:gap-x-6">
						{items.map((item) => {
							const current = isCurrent(item.href);
							return (
								<li key={item.href}>
									<Link
										href={item.href}
										// Read aloud as the current page, and the hook the stitch
										// hangs on — one fact, styled and announced from the same
										// attribute rather than from a class and an attribute
										// that can disagree.
										aria-current={current ? "page" : undefined}
										className="nav-link"
									>
										{item.label}
									</Link>
								</li>
							);
						})}
					</ul>
				</nav>
			</div>
		</header>
	);
}
