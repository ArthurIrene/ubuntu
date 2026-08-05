import type { Metadata } from "next";
import Link from "next/link";

import { Section, Stitch } from "@/components/section";
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
 *
 * ── THE DESIGN IS INHERITED, NOT INVENTED ────────────────────────────────────
 *
 * The measure, the serif headings, the stitch and the reveal are Round 1's,
 * shipped on the product page. This page adds no class, no token and no
 * component of its own.
 *
 * **One warm block, and it is the attribution.** There is no garment photograph
 * on this page and none coming, so the colour law lets a cloth tone speak — and
 * §2 gives Hill Green to *story sections with no photos nearby*, which is
 * precisely this page. The block is the paragraph that credits *umuntu ngumuntu
 * ngabantu* to the Nguni rather than claiming it: the quietest and most
 * confident thing the brand says anywhere, and the one moment here that earns
 * weight. Everything else is cream and ink.
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

	/**
	 * *The word*, in three beats: what *ubuntu* means, who the maxim beside it
	 * belongs to, and what the whole of it comes to.
	 *
	 * **The middle beat is the one lifted onto cloth**, and it is taken by
	 * position because that is what it is — the aside between the meaning and the
	 * conclusion. Reordering these paragraphs in `src/content/` would move the
	 * colour with the position rather than with the sentence, so if that ever
	 * happens this is the line to look at. It degrades rather than breaks: a
	 * shorter array simply renders fewer beats.
	 */
	const [meaning, attribution, ...conclusion] = copy.story.philosophy;

	return (
		<main>
			{/* `still` — the first thing on the page, which never rises. */}
			<Section still className="measure pt-10 md:pt-14">
				<h1 className="text-[clamp(2.375rem,7vw,3.625rem)] tracking-[-0.01em]">
					{copy.story.heading}
				</h1>
			</Section>

			<div className="measure mt-10">
				<Stitch />
			</div>

			<Section className="measure mt-12">
				<h2 className="font-serif text-2xl md:text-3xl">{copy.story.philosophyHeading}</h2>
				{meaning && <p className="mt-4 max-w-[62ch] text-lg leading-relaxed">{meaning}</p>}
			</Section>

			{/* **The one warm moment on this page.** */}
			{attribution && (
				<div className="measure mt-10">
					<Section tone="hill" garmentFree className="rounded-sm px-7 py-10 md:px-9">
						<p className="max-w-[58ch] text-lg leading-relaxed">{attribution}</p>
					</Section>
				</div>
			)}

			{conclusion.length > 0 && (
				<Section className="measure mt-10">
					<div className="flex flex-col gap-5">
						{conclusion.map((paragraph) => (
							<p key={paragraph} className="max-w-[62ch] text-lg leading-relaxed">
								{paragraph}
							</p>
						))}
					</div>
				</Section>
			)}

			<Section className="measure mt-16">
				<h2 className="font-serif text-2xl md:text-3xl">{copy.story.brandHeading}</h2>
				{/* His origin story in his own voice is founder homework (item 14). The
				    bracket is visible so it cannot ship unnoticed. */}
				<p className="mt-4 max-w-[62ch] text-lg leading-relaxed">{copy.story.brand}</p>
			</Section>

			<Section className="measure mt-16">
				<h2 className="font-serif text-2xl md:text-3xl">{copy.story.makerHeading}</h2>
				<p className="mt-4 max-w-[62ch] text-lg leading-relaxed">{copy.story.maker}</p>
				{makers.length === 0 ? (
					/* Honest about being small, and it does not invent a name he has
					   not entered. */
					<p className="mt-4 max-w-[62ch] text-lg leading-relaxed text-(--ink-quiet)">
						{copy.story.makersEmpty}
					</p>
				) : (
					<ul className="mt-5 flex flex-col gap-2">
						{makers.map((name) => (
							<li key={name} className="font-serif text-xl">
								{name}
							</li>
						))}
					</ul>
				)}
			</Section>

			<Section className="measure mt-16">
				<h2 className="font-serif text-2xl md:text-3xl">{copy.story.abantuHeading}</h2>
				<p className="mt-4 max-w-[62ch] text-lg leading-relaxed">{copy.story.abantu}</p>
			</Section>

			<div className="measure mt-16">
				<Stitch />
			</div>

			<Section className="measure mt-12 pb-4">
				<ul className="flex flex-col gap-3 leading-relaxed">
					<li>
						<Link href={path(locale, "collection")} className="stitch-link">
							{copy.story.collectionDoor}
						</Link>
					</li>
					<li>
						<Link href={path(locale, "commissions")} className="stitch-link">
							{copy.story.commissionsDoor}
						</Link>
					</li>
				</ul>
			</Section>
		</main>
	);
}
