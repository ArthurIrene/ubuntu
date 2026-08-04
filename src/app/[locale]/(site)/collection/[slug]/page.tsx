import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FitFields } from "@/components/fit-fields";
import { OrderContactFields, OrderRefusal } from "@/components/order-fields";
import { FullPhoto, LeadPhoto } from "@/components/piece-photo";
import { Section, Stitch } from "@/components/section";
import { fill } from "@/content";
import { formatDays, formatMoney } from "@/emails/order";
import { garmentFit, livePiece, siteSettings } from "@/lib/catalogue";
import { pageContext } from "@/lib/page";
import { path } from "@/lib/routes";
import { timeframes } from "@/lib/timeframes";

import { askForPiece } from "../../actions";

/**
 * A piece's own page — **the key template** *(foundation §11E)*.
 *
 * The slug is the URL segment beneath `/collection`, which is what the schema has
 * said since Phase 1 and what the dashboard's slug field edits.
 *
 * The order in which this page speaks is deliberate and is not a layout choice:
 * photograph, then name and scene and **the price immediately**, then the story,
 * and only then the order block. Story above the order block is what makes the
 * price make sense before it is asked for.
 *
 * The order block at the foot creates the order *(Phase 4)*. It is a plain
 * `<form>` posting to a Server Action: **no JavaScript, no motion and a screen
 * reader** *(R7)*, because the live fit diagram is a sketched moment and never
 * the input mechanism.
 *
 * ── WHAT PHASE 5 ROUND 1 ADDED, AND WHAT IT DID NOT ──────────────────────────
 *
 * The design. **The scene drawing is not here** — the piece's line art redrawing
 * itself as the reader scrolls is the centrepiece of this page and it is a
 * *sketched* moment: propose with a working prototype before committing. So is
 * the gallery→page image transition, and so is the live fit diagram. Round 1
 * builds the locked scroll reveal and nothing else, which is why `Section`
 * carries all the motion on this page and no component here animates anything.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
	const { locale, copy } = await pageContext(params);
	const { slug } = await params;
	const piece = await livePiece(locale, slug);

	if (!piece) return { title: copy.collection.title };
	return {
		title: piece.name,
		// The scene in a few words is the piece's own summary, written by him.
		description: piece.sceneLine ?? undefined,
	};
}

export default async function Piece({
	params,
	searchParams,
}: {
	params: Promise<{ locale: string; slug: string }>;
	searchParams: Promise<{ e?: string; f?: string }>;
}) {
	const { locale, copy } = await pageContext(params);
	const { slug } = await params;

	const [piece, settings, { e, f }] = await Promise.all([
		livePiece(locale, slug),
		siteSettings(locale),
		searchParams,
	]);

	// A draft, a removed piece, a commission and a slug that never existed are all
	// the same absence to a stranger. *Removed* and *draft* are different facts in
	// the dashboard and the same 404 here.
	if (!piece) notFound();

	// The garment type's measurement list and the bands in force *(R7)*. An
	// empty list is not a failure: the fork asks nothing and the numbers are
	// settled with him afterwards.
	const fit = await garmentFit(piece.slug);

	const time = timeframes(piece.makingDays, settings);
	const groups = [
		{ key: "colourway" as const, label: copy.piece.colourway },
		{ key: "cut" as const, label: copy.piece.cut },
		{ key: "size" as const, label: copy.piece.size },
	].filter((group) => piece.options.some((option) => option.group === group.key));

	// The photograph is what the browser should assume it is being given: the
	// measure, less its gutters, and the full viewport below that.
	const photoSizes = "(min-width: 47.5rem) 43.5rem, 100vw";

	return (
		<main>
			{/*
			 * **The piece leads, on cream, at 4:5.**
			 *
			 * `still` — it is the first thing on the page and there is nothing above
			 * it to have arrived from. A reveal here would be the page hiding the
			 * one thing the reader came for and then showing it.
			 */}
			<Section still className="measure pt-4">
				<LeadPhoto image={piece.images[0] ?? null} sizes={photoSizes} priority />
			</Section>

			<Section className="measure pt-8">
				{/* The theme he sets in the dashboard, above the name it belongs to. */}
				{settings.collectionTheme && <p className="kicker">{settings.collectionTheme}</p>}

				<h1 className="mt-3 text-[clamp(2.375rem,7vw,3.625rem)] tracking-[-0.01em]">
					{piece.name}
				</h1>

				{/* The scene in one line, in the italic — one of two places it is used. */}
				{piece.sceneLine && (
					<p className="serif-italic mt-4 max-w-[46ch] text-xl leading-snug text-(--ink-quiet) md:text-[1.4rem]">
						{piece.sceneLine}
					</p>
				)}

				{/* **The base price immediately. A price, not a starting price** *(R3)*. */}
				{piece.price && (
					<p className="mt-7 font-serif text-2xl">{formatMoney(piece.price)}</p>
				)}

				{/*
				 * **The honest timeframe, framed as unrushed** *(R4, copy.md §10)*.
				 * Hand-stitching means weeks and the page says so proudly. The priority
				 * counterpart is not here — it sits beside the option that buys it,
				 * and only while there is a queue to buy a place in.
				 */}
				{time.standardDays !== null && (
					<p className="mt-6 text-(--ink-quiet)">
						<span className="kicker block">{copy.piece.timeframeHeading}</span>
						<span className="mt-1 block">
							{fill(copy.piece.standardTimeframe, { days: formatDays(time.standardDays) })}
						</span>
					</p>
				)}
			</Section>

			<div className="measure mt-12">
				<Stitch />
			</div>

			{/* Other views, and at least one close-up of the stitching — the proof.
			    Photographs, so this section is on cream. */}
			{piece.images.length > 1 && (
				<Section className="measure mt-12">
					<h2 className="font-serif text-2xl md:text-3xl">{copy.piece.photosHeading}</h2>
					<div className="mt-6 flex flex-col gap-6">
						{piece.images.slice(1).map((image) => (
							<FullPhoto key={image.storageKey} image={image} sizes={photoSizes} />
						))}
					</div>
				</Section>
			)}

			{/*
			 * The story, above the order block.
			 *
			 * **On cloth, and this is where the warm palette is allowed to speak** —
			 * there is no garment in this section, which is the whole of the test.
			 * `garmentFree` is the assertion the type demands before the tone is
			 * available at all.
			 *
			 * In a later round the scene redraws itself as line art alongside these
			 * words. That is sketched, and not this round's.
			 */}
			{piece.story && (
				<div className="measure mt-12">
					<Section tone="tan" garmentFree className="rounded-sm px-7 py-10 md:px-9">
						<h2 className="font-serif text-2xl md:text-3xl">{copy.piece.storyHeading}</h2>
						<p className="mt-5 max-w-[60ch] text-lg leading-relaxed whitespace-pre-line">
							{piece.story}
						</p>
					</Section>
				</div>
			)}

			{/* ── THE ORDER BLOCK ──────────────────────────────────────────────── */}
			<Section className="measure mt-16">
				<h2 className="font-serif text-2xl leading-tight md:text-3xl">
					{copy.piece.fitForkHeading}
				</h2>

				{/*
				 * **One sentence, both cases, no country branch** *(R15)*. The `[X]` is
				 * an unanswered founder question and stays visible: never invent the
				 * number.
				 *
				 * copy.md §4 titles this sentence *"under the order button"*; it is read
				 * here, before the fork, because it explains why the numbers about to
				 * be asked for matter. The string is untouched.
				 */}
				<p className="mt-5 max-w-[64ch] text-(--ink-quiet)">{copy.piece.fit}</p>

				{/* On a children's piece only, and never offered as a choice *(R13)*. */}
				{piece.audience === "kids" && (
					<p className="mt-3 max-w-[64ch] text-(--ink-quiet)">{copy.piece.kidsRoom}</p>
				)}

				<OrderRefusal error={e} copy={copy.order} />

				<form action={askForPiece}>
					{/*
					 * The slug, not an id. The action resolves the piece from it under
					 * the same `kind = collection AND state = live` predicate that put
					 * this page on the screen, so a hand-edited value reaches a draft or a
					 * commission piece exactly as easily as this URL does — which is to
					 * say not at all.
					 */}
					<input type="hidden" name="slug" value={piece.slug} />

					{groups.length > 0 && (
						<div className="mt-10">
							<h3 className="font-serif text-2xl leading-tight md:text-3xl">
								{copy.piece.optionsHeading}
							</h3>
							<div className="mt-6 flex flex-col gap-7">
								{groups.map((group) => (
									// A radio group rather than a select: every choice is visible,
									// it works with no JavaScript, and a screen reader reads the
									// group's own name. **A piece with one cut asks no question**
									// — `groups` is already filtered to the ones he has set.
									<fieldset key={group.key}>
										<legend className="kicker mb-3">{group.label}</legend>
										<div className="flex flex-wrap gap-2.5">
											{piece.options
												.filter((option) => option.group === group.key)
												.map((option, index) => (
													<span key={`${group.key}:${option.key}`}>
														<input
															id={`${group.key}-${option.key}`}
															name={`option_${group.key}`}
															type="radio"
															value={option.key}
															defaultChecked={index === 0}
															className="sr-only"
														/>
														<label htmlFor={`${group.key}-${option.key}`} className="chip">
															{option.label}
														</label>
													</span>
												))}
										</div>
									</fieldset>
								))}
							</div>
						</div>
					)}

					{/*
					 * **Position in the queue, never speed** *(R4)*.
					 *
					 * This renders only while the queue offset is non-zero — `timeframes`
					 * returns null for the priority days when the line is empty, and with
					 * an empty line there is no position to sell. The write path checks
					 * the same thing again, because a field that is merely absent from the
					 * page is a suggestion.
					 */}
					{time.priorityDays !== null && (
						<fieldset className="mt-10">
							<legend className="font-serif text-2xl leading-tight md:text-3xl">
								{copy.order.form.priorityHeading}
							</legend>

							{/* The two timeframes, side by side, at the moment of choosing. */}
							<p className="mt-4 max-w-[58ch] text-(--ink-quiet)">
								{fill(copy.piece.priorityTimeframe, {
									days: formatDays(time.priorityDays),
								})}
							</p>

							<p className="mt-5">
								<input id="priority" name="priority" type="checkbox" className="align-middle" />{" "}
								<label htmlFor="priority" className="align-middle">
									{fill(copy.order.form.priority, {
										amount: formatMoney({
											value: settings.priorityModifier,
											currency: settings.currency,
										}),
									})}
								</label>
							</p>

							<p className="mt-3 max-w-[58ch] text-sm text-(--ink-quiet)">
								{copy.order.form.priorityNote}
							</p>
						</fieldset>
					)}

					{/*
					 * The fit fork *(R7, amended for launch)*. **Standard sizing leads;
					 * measurements are the invited second path** — and both ship in full.
					 *
					 * Bare on purpose: no JavaScript, no motion, a screen reader, every
					 * instruction beside its own field rather than in a tooltip. The
					 * live diagram is a sketched moment that reads these fields; it is
					 * never the input mechanism.
					 *
					 * With no measurement list configured on the garment type there is
					 * nothing to ask, and nothing is invented — he settles the numbers
					 * once he has confirmed the piece, which R7 already describes.
					 */}
					{fit.measurements.length > 0 || fit.sizes.length > 0 ? (
						<FitFields
							copy={copy.order.fit}
							pieceCopy={copy.piece}
							specs={fit.measurements}
							sizes={fit.sizes}
							audience={piece.audience}
							refused={f?.split(",").filter(Boolean) ?? []}
						/>
					) : (
						<div className="mt-12">
							<p className="max-w-[58ch] text-(--ink-quiet)">{copy.piece.fitForkSize}</p>
							<p className="mt-3 max-w-[58ch] text-(--ink-quiet)">
								{copy.piece.fitForkMeasurements}
							</p>
							<p className="mt-5 max-w-[58ch] text-(--ink-quiet)">{copy.order.form.fitLater}</p>
						</div>
					)}

					<OrderContactFields locale={locale} copy={copy.order.form} />

					{/* **Never anything else.** Not "Buy now", not "Add to cart". */}
					<p className="mt-12">
						<button type="submit" className="ask">
							{copy.piece.orderButton}
						</button>
					</p>
				</form>

				{/* Three lines, exactly. They are what the button promises, so they are
				    read with it and not tucked inside the form. */}
				<ul className="mt-7 list-none leading-loose text-(--ink-quiet)">
					{copy.piece.beneathButton.map((line) => (
						<li key={line}>{line}</li>
					))}
				</ul>
			</Section>

			{/* Bottom doors. */}
			<Section className="measure mt-16 pb-4">
				<ul className="flex flex-col gap-3 leading-relaxed">
					<li>
						<Link href={path(locale, "making")} className="stitch-link">
							{copy.piece.makingDoor}
						</Link>
					</li>
					<li>
						<Link href={path(locale, "commissions")} className="stitch-link">
							{copy.piece.commissionsDoor}
						</Link>
					</li>
					<li>
						<Link href={path(locale, "collection")} className="stitch-link">
							{copy.piece.back}
						</Link>
					</li>
				</ul>
			</Section>
		</main>
	);
}
