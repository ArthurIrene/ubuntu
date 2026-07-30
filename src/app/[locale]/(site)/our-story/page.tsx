import type { Metadata } from "next";
import Link from "next/link";

import { makerNames } from "@/lib/catalogue";
import { pageContext } from "@/lib/page";
import { path } from "@/lib/routes";

/**
 * *Our story*, at `/our-story`.
 *
 * A descent from the widest circle to the smallest: philosophy → brand → maker →
 * community. Readable in three minutes; depth through precision, not length.
 *
 * **This is the page the makers table exists for** *(R16)*. A typed maker name per
 * order would be a backfill of misspellings on the day this page is written —
 * *Jean-Claude*, *Jean Claude*, *JC* — so the maker is a row with an FK, and the
 * names here are read from it. Faces, bios and past work are Phase 8.
 *
 * The maxim is **named as Nguni**, because the specificity rule says a cultural
 * reference is named precisely or not gestured at. The word *ubuntu* is fully
 * Kinyarwanda; the sentence usually said alongside it is Zulu and Xhosa. No
 * Kinyarwanda proverb has been invented to fill the gap.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { copy } = await pageContext(params);
	return { title: copy.story.title };
}

export default async function OurStory({ params }: { params: Promise<{ locale: string }> }) {
	const { locale, copy } = await pageContext(params);
	const makers = await makerNames();

	return (
		<main>
			<h1>{copy.story.heading}</h1>

			<section>
				<h2>{copy.story.philosophyHeading}</h2>
				{copy.story.philosophy.map((paragraph) => (
					<p key={paragraph}>{paragraph}</p>
				))}
			</section>

			<section>
				<h2>{copy.story.brandHeading}</h2>
				{/* His origin story in his own voice is founder homework (item 14). The
				    bracket is visible so it cannot ship unnoticed. */}
				<p>{copy.story.brand}</p>
			</section>

			<section>
				<h2>{copy.story.makerHeading}</h2>
				<p>{copy.story.maker}</p>
				{makers.length === 0 ? (
					/* Honest about being small, and it does not invent a name he has
					   not entered. */
					<p>{copy.story.makersEmpty}</p>
				) : (
					<ul>
						{makers.map((name) => (
							<li key={name}>{name}</li>
						))}
					</ul>
				)}
			</section>

			<section>
				<h2>{copy.story.abantuHeading}</h2>
				<p>{copy.story.abantu}</p>
			</section>

			<p>
				<Link href={path(locale, "collection")}>{copy.story.collectionDoor}</Link>
			</p>
			<p>
				<Link href={path(locale, "commissions")}>{copy.story.commissionsDoor}</Link>
			</p>
		</main>
	);
}
