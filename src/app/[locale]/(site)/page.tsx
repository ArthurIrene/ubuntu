import type { Metadata } from "next";
import Link from "next/link";

import PieceCard from "@/components/piece-card";
import { Section, Stitch } from "@/components/section";
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
 *
 * ── THE DESIGN IS INHERITED, NOT INVENTED ────────────────────────────────────
 *
 * The last unstyled public page, and the one with the least room to invent
 * anything: a stranger's first screen has to be recognisably the same site as the
 * page they open next. So it is Round 1's system as the other five pages already
 * speak it — the same measure, the same kicker, the same serif headings, the same
 * `Stitch`, the same `.ask` and `.stitch-link`, the same `Section` reveal, and the
 * card dressed once in `piece-card.tsx` and reused untouched. No new class, token
 * or component.
 *
 * **The hero is still, and it is the one heading allowed to be larger than the
 * other pages' headings.** Every other `h1` on the site names a page; this one is
 * a sentence, and it is the whole of the first screen. It is the same clamp
 * written one size up, not a new type scale.
 *
 * **No motion beyond the reveal.** The first arrival — cream screen, the
 * signature writing itself, then rising into the header — is locked in
 * `motion.md` §1 and belongs to Phase 6; the *line becoming a community* drawing
 * beside *Who we are* is sketched, propose-before-build. Neither is faked here,
 * and nothing is left in the layout waiting for them.
 *
 * **One warm block, and it is the ritual.** Foundation §11C names it precisely —
 * *full-width on Savanna Tan, no photo* — so the colour is taken from the
 * document rather than chosen, and this is why it is not on *Who we are*, which
 * is the other candidate:
 *
 * - It sits **after** the window display. Everything above the pieces stays cream,
 *   which is what the colour law is protecting on the one page whose job is to
 *   show them: a warm band between the hero and the photographs would be the
 *   loudest thing on the visitor's first screenful and the garments the second.
 * - *Every piece carries a story* is a lyric passage with a door under it and no
 *   photograph in it — §2's *"soft fills, quotes, gentle blocks"*, which is tan.
 * - *Who we are* is the section §11A wants the drawing in. Painting it warm would
 *   put something in the space that moment is coming to occupy, and it would have
 *   to be given back.
 *
 * Everything else is cream and ink, with wine only as thread — the hero button's
 * outline, the stitches, the underlines, the focus ring.
 */
export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
	const { locale, copy } = await pageContext(params);
	const [window, settings] = await Promise.all([windowCards(locale), siteSettings(locale)]);
	// The ritual section's one door, taken from what he has chosen to show.
	const door = window[0] ?? null;

	return (
		<main>
			{/*
			 * 1. The hero. Phase 6 puts the signature drawing itself here.
			 *
			 * `still` — the first thing on the page, and the one thing on this site a
			 * stranger sees before they have decided to stay. It never rises, never
			 * fades in, and does not wait on a script: with JavaScript off, with
			 * reduced motion, and mid-download it is already finished.
			 */}
			<Section still className="measure pt-16 pb-2 md:pt-24 md:pb-6">
				<h1 className="text-[clamp(2.625rem,8vw,4.25rem)] tracking-[-0.015em]">
					{copy.home.hero}
				</h1>
				{/*
				 * *One button: See the collection* *(foundation §11A)* — so it is the
				 * site's button, `.ask`, and not a second one that looks nearly like it.
				 * The class is named for the string it was written under and is really
				 * the one door the brand draws in wine: outlined, filling on hover and
				 * on focus. `inline-block` because an anchor takes no vertical padding
				 * otherwise, and the padding is the shape.
				 */}
				<p className="mt-9 md:mt-11">
					<Link href={path(locale, "collection")} className="ask inline-block">
						{copy.home.heroButton}
					</Link>
				</p>
			</Section>

			<div className="measure mt-14 md:mt-16">
				<Stitch />
			</div>

			{/*
			 * 2. Who we are — three or four lines, then out of the way.
			 *
			 * **One column, and it is not a split with a hole in it.** §11A draws this
			 * as text left and the line-becoming-a-community drawing right; that
			 * drawing is a sketched moment. A two-column layout shipped with one
			 * column empty does not read as restraint, it reads as an image that
			 * failed to load — so the paragraph is set at the measure the whole site
			 * reads at, one size up, and finishes where it means to. The day the
			 * drawing arrives it takes the right-hand half and this becomes the split
			 * it was always going to be.
			 */}
			<Section className="measure mt-12">
				<h2 className="font-serif text-2xl md:text-3xl">{copy.home.whoWeAreHeading}</h2>
				<p className="mt-4 max-w-[62ch] text-lg leading-relaxed md:text-xl">
					{copy.home.whoWeAre}
				</p>
			</Section>

			{/*
			 * 3. The window display — **his hand choosing what a stranger meets
			 * first** *(R1, R10)*, in the order he put them in. Emphatically not the
			 * four most recent: the collection page already answers newest-first, and
			 * it is changeable at will so nothing is ever made artificially scarce.
			 *
			 * **Cream, and here that is not a preference.** This section is garment
			 * photographs; the colour law forbids a cloth tone in it permanently.
			 */}
			<Section className="measure mt-16">
				{/* Theme above, kicker over it — the header the collection page and the
				    product page both wear, so the three read as one site. Kicker and
				    heading are one child so they arrive together rather than the label
				    rising ahead of the thing it labels. */}
				<div>
					<p className="kicker">{copy.home.collectionKicker}</p>
					{/* The theme is a dashboard field; unwritten, it falls back to the
					    draft default in his voice, so the page reads completely from day
					    one. Exactly as `/collection` reads it. */}
					<h2 className="mt-3 font-serif text-3xl tracking-[-0.01em] md:text-4xl">
						{settings.collectionTheme ?? copy.home.collectionTheme}
					</h2>
				</div>

				{window.length === 0 ? (
					/*
					 * Nothing chosen, or nothing live yet. Calm, and neither an apology
					 * nor scarcity — the same register `/collection` empty is in. It is
					 * given the room the grid would have had, because on an empty
					 * catalogue it *is* this part of the page.
					 */
					<p className="mt-8 max-w-[52ch] text-lg leading-relaxed md:text-xl">
						{copy.home.windowEmpty}
					</p>
				) : (
					/*
					 * **Desktop 2×2, mobile stacks full-width** *(foundation §11B)*, and
					 * the same grid `/collection` draws — same measure, same columns, so
					 * a piece is the same size in the window as it is in the collection
					 * and the two pages do not disagree about how big his work is.
					 *
					 * One `Section` around the whole grid, not one per card: the pieces
					 * arrive together, because a grid revealing card after card is the
					 * page twitching all the way down that motion.md §3 forbids.
					 */
					<ul className="mt-10 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2">
						{window.map((card) => (
							<PieceCard
								key={card.slug}
								locale={locale}
								card={card}
								/*
								 * Two columns inside the 47.5rem measure is a 344px card once
								 * the page stops growing — the same arithmetic `/collection`
								 * does, because it is the same grid.
								 */
								sizes="(min-width: 47.5rem) 344px, (min-width: 40rem) 45vw, 100vw"
								/*
								 * **Nothing here is priority, and that is the difference from
								 * `/collection`.** The window is this page's third movement:
								 * the hero and *Who we are* are above it, so the first
								 * photograph is below the fold on a phone and on a laptop.
								 * Fetching two of them at high priority would compete with the
								 * faces and the hero for a first screen they are not on, on
								 * mobile data these visitors pay for by the megabyte. Lazy is
								 * the honest setting; the LCP here is the hero line.
								 */
							/>
						))}
					</ul>
				)}

				<div className="mt-10">
					<p className="max-w-[52ch] text-lg text-(--ink-quiet)">{copy.home.bridge}</p>
					<p className="mt-4">
						<Link href={path(locale, "collection")} className="stitch-link">
							{copy.home.collectionDoor}
						</Link>
					</p>
				</div>
			</Section>

			{/*
			 * 4. The ritual, with one door into a real piece.
			 *
			 * **The page's one warm block** — *full-width on Savanna Tan, no photo*
			 * *(foundation §11C)*. Full-bleed rather than a card at the measure,
			 * because §11C says full-width and because this is the page's held breath
			 * between the pieces and the practical sections that follow it.
			 *
			 * The band is the `Section`, so the ground reaches both edges; the measure
			 * is worn by each child instead, which keeps them the reveal's direct
			 * children and keeps the left edge exactly where every other line on the
			 * page sits. A wrapper here would have made the whole band one element and
			 * the stagger would have gone with it.
			 */}
			<Section tone="tan" garmentFree className="mt-16 py-14 md:py-20">
				<h2 className="measure font-serif text-3xl tracking-[-0.01em] md:text-4xl">
					{copy.home.ritualHeading}
				</h2>
				<p className="measure mt-5 text-lg leading-relaxed md:text-xl">{copy.home.ritual}</p>
				{/* The line the section turns on, in the serif italic the site gives its
				    scene lines and its maxim — one of exactly two faces that carry a
				    sentence rather than a label. */}
				<p className="serif-italic measure mt-6 text-xl leading-relaxed md:text-2xl">
					{copy.home.ritualClose}
				</p>
				{/* The door names the piece it opens, so it is never a promise the
				    catalogue cannot keep — with nothing live there is no door. */}
				{door && (
					<p className="measure mt-8">
						<Link href={piecePath(locale, door.slug)} className="stitch-link">
							{fill(copy.home.ritualDoor, { piece: door.name })}
						</Link>
					</p>
				)}
			</Section>

			{/* 5. The making, condensed. The full page is its own route. */}
			<Section className="measure mt-16">
				<h2 className="font-serif text-2xl md:text-3xl">{copy.home.makingHeading}</h2>
				<p className="mt-4 max-w-[62ch] text-lg leading-relaxed">{copy.home.makingCondensed}</p>
				<p className="mt-5">
					<Link href={path(locale, "making")} className="stitch-link">
						{copy.home.makingDoor}
					</Link>
				</p>
			</Section>

			<div className="measure mt-16">
				<Stitch />
			</div>

			{/*
			 * 6. Collective greatness — the closing section, one door into the story
			 * and one into a commission. The phrase appears exactly twice on this
			 * page, here and in *Who we are*, and never a third time.
			 *
			 * Left on cream. It is the page's most honest passage — *there is no crowd
			 * here yet, and we will not pretend there is one* — and a colour block
			 * around a sentence like that would dress it up, which is the one thing it
			 * must not be.
			 */}
			<Section className="measure mt-12 pb-4">
				<h2 className="font-serif text-2xl md:text-3xl">{copy.home.closingHeading}</h2>
				<p className="mt-4 max-w-[62ch] text-lg leading-relaxed">{copy.home.closing}</p>
				<ul className="mt-6 flex flex-col gap-3 leading-relaxed">
					<li>
						<Link href={path(locale, "story")} className="stitch-link">
							{copy.home.storyDoor}
						</Link>
					</li>
					<li>
						<Link href={path(locale, "commissions")} className="stitch-link">
							{copy.home.commissionsDoor}
						</Link>
					</li>
				</ul>
			</Section>
		</main>
	);
}
