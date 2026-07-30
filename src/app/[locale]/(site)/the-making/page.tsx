import type { Metadata } from "next";
import Link from "next/link";

import { pageContext } from "@/lib/page";
import { path } from "@/lib/routes";

/**
 * *The making* — promoted from a homepage section to its own page, because people
 * return to it at different moments.
 *
 * It carries the four steps with the honest *why* at each, the progress-photo
 * promise, the fit system, the fit policy stated fairly, and timeline honesty:
 * hand-stitching means weeks, said proudly.
 *
 * Every string here is code, not a dashboard field — page structure and fixed
 * strings are brand voice, and brand voice is design *(R9d)*. Nothing on this page
 * reads the database, so it prerenders.
 */
export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { copy } = await pageContext(params);
	return { title: copy.making.title };
}

export default async function TheMaking({ params }: { params: Promise<{ locale: string }> }) {
	const { locale, copy } = await pageContext(params);

	return (
		<main>
			<h1>{copy.making.heading}</h1>
			<p>{copy.making.opening}</p>

			<ol>
				{copy.making.steps.map((step) => (
					<li key={step.heading}>
						<h2>{step.heading}</h2>
						<p>{step.body}</p>
					</li>
				))}
			</ol>

			{/* The trust masterstroke: he posts the photographs as he works. */}
			<section>
				<h2>{copy.making.photosHeading}</h2>
				<p>{copy.making.photos}</p>
			</section>

			<section>
				<h2>{copy.making.timelineHeading}</h2>
				<p>{copy.making.timeline}</p>
			</section>

			<section>
				<h2>{copy.making.fitHeading}</h2>
				<p>{copy.making.fit}</p>

				{/*
				 * The list travels on its own, because the measurements path routes
				 * through a third person who sees none of the on-page instruction.
				 */}
				<h3>{copy.making.tailorHeading}</h3>
				<p>{copy.making.tailor}</p>
			</section>

			{/*
			 * The fair statement. The last paragraph does the real work: it states the
			 * hard rule, then turns it into the reason the brand exists, so the reader
			 * finishes feeling privileged rather than warned.
			 */}
			<section>
				<h2>{copy.making.misfitHeading}</h2>
				{copy.making.misfit.map((paragraph) => (
					<p key={paragraph}>{paragraph}</p>
				))}
			</section>

			<p>
				<Link href={path(locale, "collection")}>{copy.making.collectionDoor}</Link>
			</p>
			<p>
				<Link href={path(locale, "policies")}>{copy.making.policiesDoor}</Link>
			</p>
		</main>
	);
}
