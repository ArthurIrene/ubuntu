import type { Metadata } from "next";

import PieceCard from "@/components/piece-card";
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
 * Never "drop." A drop implies the thing goes away, and nothing here does.
 *
 * **Card fields only** *(R8)*. No story, no photo set — this page reads one
 * photograph per piece and four columns, because loading the rest to render a grid
 * is how the site becomes slow on the mobile data most visitors arrive on.
 *
 * No filter bar. The taxonomy is in the schema from day one and the interface waits
 * until the catalogue earns it, at roughly 15–20 pieces: a filter above four items
 * makes a small brand look like an empty shop.
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
			<p>{copy.collection.kicker}</p>
			{/* The theme is a dashboard field; unwritten, it falls back to the draft
			    default in his voice, so the page reads completely from day one. */}
			<h1>{settings.collectionTheme ?? copy.home.collectionTheme}</h1>
			<p>{copy.collection.bridge}</p>

			{cards.length === 0 ? (
				/*
				 * Not scarcity and not an apology. The catalogue is small because the
				 * hands are two, and the honest sentence is the brand's own.
				 */
				<p>{copy.collection.empty}</p>
			) : (
				<ul>
					{cards.map((card, index) => (
						<PieceCard
							key={card.slug}
							locale={locale}
							card={card}
							// Desktop 2×2, mobile full-width — so a card is the viewport
							// on a phone and half of it above the fold on a laptop.
							sizes="(min-width: 40rem) 50vw, 100vw"
							// The first two are what a visitor lands on. Everything below
							// is lazy, on data they are paying for by the megabyte.
							priority={index < 2}
						/>
					))}
				</ul>
			)}
		</main>
	);
}
