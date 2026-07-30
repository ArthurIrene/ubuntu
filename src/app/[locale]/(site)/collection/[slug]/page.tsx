import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FullPhoto } from "@/components/piece-photo";
import { fill } from "@/content";
import { formatDays, formatMoney } from "@/emails/order";
import { livePiece, siteSettings } from "@/lib/catalogue";
import { pageContext } from "@/lib/page";
import { path } from "@/lib/routes";
import { timeframes } from "@/lib/timeframes";

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
 * **The order block does not submit.** Phase 4 is what creates an order; this is
 * the read side, so there is no `<form>` here at all — a form with no action
 * submits itself to this page on Enter, which is a worse placeholder than none.
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
}: {
	params: Promise<{ locale: string; slug: string }>;
}) {
	const { locale, copy } = await pageContext(params);
	const { slug } = await params;

	const [piece, settings] = await Promise.all([livePiece(locale, slug), siteSettings(locale)]);

	// A draft, a removed piece, a commission and a slug that never existed are all
	// the same absence to a stranger. *Removed* and *draft* are different facts in
	// the dashboard and the same 404 here.
	if (!piece) notFound();

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
			 * The order block. Every field below is where Phase 4's form mounts — the
			 * options he has set, the fit fork, contact details. Rendered, inert, and
			 * deliberately not wrapped in a form.
			 */}
			<section>
				{groups.length > 0 && (
					<>
						<h2>{copy.piece.optionsHeading}</h2>
						{groups.map((group) => (
							<div key={group.key}>
								<h3>{group.label}</h3>
								<ul>
									{piece.options
										.filter((option) => option.group === group.key)
										.map((option) => (
											<li key={`${group.key}:${option.label}`}>{option.label}</li>
										))}
								</ul>
							</div>
						))}
					</>
				)}

				<h2>{copy.piece.fitForkHeading}</h2>
				{/* Measurements are the urged path; a size is a real choice, not a
				    fallback. Warm, never insistent. */}
				<p>{copy.piece.fitForkMeasurements}</p>
				<p>{copy.piece.fitForkSize}</p>

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

				{/*
				 * **Never anything else.** Inert until Phase 4 — `disabled` rather than
				 * absent, because the words beneath it are what the button promises and
				 * they have to be read together.
				 */}
				<p>
					<button type="button" disabled>
						{copy.piece.orderButton}
					</button>
				</p>

				{/* Three lines, exactly. */}
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
