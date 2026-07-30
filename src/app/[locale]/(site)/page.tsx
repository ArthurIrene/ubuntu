import type { Metadata } from "next";
import Link from "next/link";

import { pageContext } from "@/lib/page";
import { path } from "@/lib/routes";

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

			{/* 3. The window display arrives here with the catalogue query. */}

			{/* 4. The ritual. */}
			<section>
				<h2>{copy.home.ritualHeading}</h2>
				<p>{copy.home.ritual}</p>
				<p>{copy.home.ritualClose}</p>
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
