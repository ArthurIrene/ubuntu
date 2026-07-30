import type { Metadata } from "next";
import Link from "next/link";

import PieceCard from "@/components/piece-card";
import { fill } from "@/content";
import { siteSettings, windowCards } from "@/lib/catalogue";
import { pageContext } from "@/lib/page";
import { path, piecePath } from "@/lib/routes";

/**
 * Read on every request, not prerendered at build time.
 *
 * The window display is a dashboard field: he changes what a stranger meets first
 * whenever he likes, and a page baked at deploy time would show the previous
 * choice until someone deployed again. Warm reads through Hyperdrive are ~100ms,
 * and whether any of this earns a cache is a Phase 7 question with a real
 * connection in front of it — not a guess made here.
 */
export const dynamic = "force-dynamic";

// The landing route. No robots directive of its own, so it inherits the
// layout's: English indexable, Kinyarwanda noindex until the switcher flips.
export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { copy } = await pageContext(params);
	return { title: copy.home.title };
}

/**
 * The landing page.
 *
 * **A landing page, not the shop** *(R10)*. The window display sits inside it,
 * but the page's job is to explain what this is before it asks for anything: most
 * arrivals come from a fifteen-second video on a phone knowing nothing about the
 * brand, and they have to learn that nothing is stocked or a made-to-order price
 * makes no sense.
 *
 * The order the sections run in is the argument: show the beauty → state who we
 * are → earn the trust → offer the meaning.
 */
export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
	const { locale, copy } = await pageContext(params);
	const [window, settings] = await Promise.all([windowCards(locale), siteSettings(locale)]);
	// The ritual section's one door, taken from what he has chosen to show.
	const door = window[0] ?? null;

	return (
		<main>
			{/* 1. The hero. Phase 6 puts the signature drawing itself here. */}
			<section>
				<h1>{copy.home.hero}</h1>
				<p>
					<Link href={path(locale, "collection")}>{copy.home.heroButton}</Link>
				</p>
			</section>

			{/* 2. Who we are — three or four lines, then out of the way. */}
			<section>
				<h2>{copy.home.whoWeAreHeading}</h2>
				<p>{copy.home.whoWeAre}</p>
			</section>

			{/*
			 * 3. The window display — **his hand choosing what a stranger meets
			 * first** *(R1, R10)*, in the order he put them in. Emphatically not the
			 * four most recent: the collection page already answers newest-first, and
			 * it is changeable at will so nothing is ever made artificially scarce.
			 */}
			<section>
				<p>{copy.home.collectionKicker}</p>
				<h2>{settings.collectionTheme ?? copy.home.collectionTheme}</h2>

				{window.length === 0 ? (
					<p>{copy.home.windowEmpty}</p>
				) : (
					<ul>
						{window.map((card, index) => (
							<PieceCard
								key={card.slug}
								locale={locale}
								card={card}
								sizes="(min-width: 40rem) 50vw, 100vw"
								priority={index < 2}
							/>
						))}
					</ul>
				)}

				<p>{copy.home.bridge}</p>
				<p>
					<Link href={path(locale, "collection")}>{copy.home.collectionDoor}</Link>
				</p>
			</section>

			{/* 4. The ritual, with one door into a real piece. */}
			<section>
				<h2>{copy.home.ritualHeading}</h2>
				<p>{copy.home.ritual}</p>
				<p>{copy.home.ritualClose}</p>
				{/* The door names the piece it opens, so it is never a promise the
				    catalogue cannot keep — with nothing live there is no door. */}
				{door && (
					<p>
						<Link href={piecePath(locale, door.slug)}>
							{fill(copy.home.ritualDoor, { piece: door.name })}
						</Link>
					</p>
				)}
			</section>

			{/* 5. The making, condensed. The full page is its own route. */}
			<section>
				<h2>{copy.home.makingHeading}</h2>
				<p>{copy.home.makingCondensed}</p>
				<p>
					<Link href={path(locale, "making")}>{copy.home.makingDoor}</Link>
				</p>
			</section>

			{/*
			 * 6. Collective greatness — the closing section, one door into the story
			 * and one into a commission. The phrase appears exactly twice on this
			 * page, here and in *Who we are*, and never a third time.
			 */}
			<section>
				<h2>{copy.home.closingHeading}</h2>
				<p>{copy.home.closing}</p>
				<p>
					<Link href={path(locale, "story")}>{copy.home.storyDoor}</Link>
				</p>
				<p>
					<Link href={path(locale, "commissions")}>{copy.home.commissionsDoor}</Link>
				</p>
			</section>
		</main>
	);
}
