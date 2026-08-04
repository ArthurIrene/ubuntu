import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FitFields } from "@/components/fit-fields";
import { OrderContactFields, OrderRefusal } from "@/components/order-fields";
import { FullPhoto } from "@/components/piece-photo";
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
 * reader** *(R7)*, because the live fit diagram is an enhancement in Phase 6 and
 * never the input mechanism.
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

	return (
		<main>
			{/* The photograph leads. The first one is not lazy; the rest are. */}
			<FullPhoto
				image={piece.images[0] ?? null}
				sizes="(min-width: 40rem) 50vw, 100vw"
				priority
			/>

			<h1>{piece.name}</h1>
			{piece.sceneLine && <p>{piece.sceneLine}</p>}
			{/* The base price immediately. A price, not a starting price *(R3)*. */}
			{piece.price && <p>{formatMoney(piece.price)}</p>}

			{/* Other views, and at least one close-up of the stitching — the proof. */}
			{piece.images.length > 1 && (
				<section>
					<h2>{copy.piece.photosHeading}</h2>
					{piece.images.slice(1).map((image) => (
						<FullPhoto
							key={image.storageKey}
							image={image}
							sizes="(min-width: 40rem) 50vw, 100vw"
						/>
					))}
				</section>
			)}

			{/* The story, above the order block. In Phase 6 the scene redraws itself
			    as line art alongside these words. */}
			{piece.story && (
				<section>
					<h2>{copy.piece.storyHeading}</h2>
					<p>{piece.story}</p>
				</section>
			)}

			{/*
			 * The order block. It creates the order and redirects to its private page.
			 *
			 * The timeframes are read *outside* the form, above it, because they are
			 * what the piece costs in time rather than something to answer.
			 */}
			<section>
				{time.standardDays !== null && (
					<>
						<h2>{copy.piece.timeframeHeading}</h2>
						<p>{fill(copy.piece.standardTimeframe, { days: formatDays(time.standardDays) })}</p>
						{/* Only while the queue offset is non-zero. */}
						{time.priorityDays !== null && (
							<p>
								{fill(copy.piece.priorityTimeframe, {
									days: formatDays(time.priorityDays),
								})}
							</p>
						)}
					</>
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
						<>
							<h2>{copy.piece.optionsHeading}</h2>
							{groups.map((group) => (
								// A radio group rather than a select: every choice is visible,
								// it works with no JavaScript, and a screen reader reads the
								// group's own name. **A piece with one cut asks no question**
								// — `groups` is already filtered to the ones he has set.
								<fieldset key={group.key}>
									<legend>{group.label}</legend>
									{piece.options
										.filter((option) => option.group === group.key)
										.map((option, index) => (
											<p key={`${group.key}:${option.key}`}>
												<input
													id={`${group.key}-${option.key}`}
													name={`option_${group.key}`}
													type="radio"
													value={option.key}
													defaultChecked={index === 0}
												/>
												<label htmlFor={`${group.key}-${option.key}`}>{option.label}</label>
											</p>
										))}
								</fieldset>
							))}
						</>
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
						<>
							<h2>{copy.order.form.priorityHeading}</h2>
							<p>
								<input id="priority" name="priority" type="checkbox" />
								<label htmlFor="priority">
									{fill(copy.order.form.priority, {
										amount: formatMoney({
											value: settings.priorityModifier,
											currency: settings.currency,
										}),
									})}
								</label>
							</p>
							<p>{copy.order.form.priorityNote}</p>
						</>
					)}

					{/*
					 * The fit fork *(R7)*. **Measurements are the urged path and
					 * therefore taught; a size is a real choice, not a fallback.**
					 *
					 * Bare on purpose: no JavaScript, no motion, a screen reader, every
					 * instruction beside its own field rather than in a tooltip. The
					 * live diagram is Phase 6 and reads these fields; it is never the
					 * input mechanism.
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
						<>
							<h2>{copy.piece.fitForkHeading}</h2>
							<p>{copy.piece.fitForkMeasurements}</p>
							<p>{copy.piece.fitForkSize}</p>
							<p>{copy.order.form.fitLater}</p>
						</>
					)}

					<OrderContactFields locale={locale} copy={copy.order.form} />

					{/* **Never anything else.** */}
					<p>
						<button type="submit">{copy.piece.orderButton}</button>
					</p>
				</form>

				{/* Three lines, exactly. They are what the button promises, so they are
				    read with it and not tucked inside the form. */}
				{copy.piece.beneathButton.map((line) => (
					<p key={line}>{line}</p>
				))}

				{/* One sentence, both cases, no country branch *(R15)*. */}
				<p>{copy.piece.fit}</p>
				{/* On a children's piece only, and never offered as a choice *(R13)*. */}
				{piece.audience === "kids" && <p>{copy.piece.kidsRoom}</p>}
			</section>

			{/* Bottom doors. */}
			<p>
				<Link href={path(locale, "making")}>{copy.piece.makingDoor}</Link>
			</p>
			<p>
				<Link href={path(locale, "commissions")}>{copy.piece.commissionsDoor}</Link>
			</p>
			<p>
				<Link href={path(locale, "collection")}>{copy.piece.back}</Link>
			</p>
		</main>
	);
}
