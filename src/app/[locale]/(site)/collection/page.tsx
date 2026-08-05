import type { Metadata } from "next";

import PieceCard from "@/components/piece-card";
import { Section, Stitch } from "@/components/section";
import { collectionCards, siteSettings } from "@/lib/catalogue";
import { pageContext } from "@/lib/page";

/**
 * The collection.
 *
 * **Sorts newest-first, and is the permanent answer to "what's new"** *(R10)* —
 * one stable URL he can post every time he finishes something, which never goes
 * stale and never sits empty. There is no `/new`: with four pieces it would be
 * this page with a different heading, and it would have to be maintained.
 *
 * **The ordering is silent.** Newest-first happens in the data layer and is never
 * announced — no "newly stitched" banner over the first card, no count, no badge.
 * Never "drop": a drop implies the thing goes away, and nothing here does.
 *
 * **Card fields only** *(R8)*. No story, no photo set — this page reads one
 * photograph per piece and four columns, because loading the rest to render a grid
 * is how the site becomes slow on the mobile data most visitors arrive on.
 *
 * No filter bar. The taxonomy is in the schema from day one and the interface waits
 * until the catalogue earns it, at roughly 15–20 pieces: a filter above four items
 * makes a small brand look like an empty shop.
 *
 * ── THE DESIGN IS INHERITED, NOT INVENTED ────────────────────────────────────
 *
 * Round 1's system, as the product page speaks it: the same measure, the same
 * kicker, the same serif heading, the same `Stitch`, the same reveal. No new
 * class, token or component — the card itself is dressed in `piece-card.tsx`.
 *
 * **Cream and ink throughout, and this one is not a preference.** The page is
 * nothing but garment photographs, and the colour law says strong colour and
 * garment photos never share a section. There is no warm block here and there
 * never can be.
 *
 * **The header reads theme-then-page**, matching the product page: the collection
 * theme is the eyebrow and the page names itself underneath. That is the reverse
 * of the skeleton, which used a fixed string as the eyebrow and promoted the
 * theme to the heading — see the commit message, because it leaves
 * `collection.kicker` rendering nowhere.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { copy } = await pageContext(params);
	return { title: copy.collection.title };
}

export default async function Collection({ params }: { params: Promise<{ locale: string }> }) {
	const { locale, copy } = await pageContext(params);
	const [cards, settings] = await Promise.all([collectionCards(locale), siteSettings(locale)]);

	return (
		<main>
			{/* `still` — the first thing on the page, which never rises. */}
			<Section still className="measure pt-10 md:pt-14">
				{/* The theme is a dashboard field; unwritten, it falls back to the draft
				    default in his voice, so the page reads completely from day one. */}
				<p className="kicker">{settings.collectionTheme ?? copy.home.collectionTheme}</p>
				<h1 className="mt-3 text-[clamp(2.375rem,7vw,3.625rem)] tracking-[-0.01em]">
					{copy.collection.heading}
				</h1>
				<p className="mt-5 max-w-[62ch] text-lg text-(--ink-quiet) md:text-xl">
					{copy.collection.bridge}
				</p>
			</Section>

			<div className="measure mt-12">
				<Stitch />
			</div>

			{cards.length === 0 ? (
				/*
				 * Not scarcity and not an apology. The catalogue is small because the
				 * hands are two, and the honest sentence is the brand's own. It gets
				 * the room a grid would have had rather than being tucked into a
				 * corner, because on an empty catalogue it *is* the page.
				 */
				<Section className="measure mt-16 pb-16">
					<p className="max-w-[52ch] text-lg leading-relaxed md:text-xl">
						{copy.collection.empty}
					</p>
				</Section>
			) : (
				/*
				 * One column on a phone, two from 40rem up. Two rather than three: the
				 * grid sits at the same measure as the header so their left edges line
				 * up, and three columns inside it would crop each piece to a thumbnail
				 * on the one page where the photographs are the whole argument.
				 *
				 * The whole grid is one Section, so the pieces arrive together. Twelve
				 * cards revealing one after another would be the page twitching all the
				 * way down that motion.md §3 forbids.
				 */
				<Section className="measure mt-14 pb-16">
					<ul className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2">
						{cards.map((card, index) => (
							<PieceCard
								key={card.slug}
								locale={locale}
								card={card}
								/*
								 * What the grid above actually does. Two columns inside a
								 * 47.5rem measure is a 344px card once the page stops
								 * growing, so a phone at DPR 2 fetches the 800px
								 * derivative and a laptop the 400 — the earlier `50vw`
								 * described a full-bleed grid this is not, and asked for
								 * a size larger than any card is ever drawn at.
								 */
								sizes="(min-width: 47.5rem) 344px, (min-width: 40rem) 45vw, 100vw"
								// The first two are what a visitor lands on. Everything below
								// is lazy, on data they are paying for by the megabyte.
								priority={index < 2}
							/>
						))}
					</ul>
				</Section>
			)}
		</main>
	);
}
