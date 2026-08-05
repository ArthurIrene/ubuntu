import type { Metadata } from "next";
import Link from "next/link";

import { Section, Stitch } from "@/components/section";
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
 *
 * ── THE DESIGN IS INHERITED, NOT INVENTED ────────────────────────────────────
 *
 * The measure, the kicker, the serif headings, the stitch and the reveal are all
 * Round 1's, shipped on the product page. **Going wide means inheriting the
 * language, not writing a second one**, so this page adds no class, no token and
 * no component of its own — every movement is a `Section` at `measure`, which is
 * also what puts it inside the locked scroll reveal.
 *
 * **One warm block, and it is *It takes weeks*.** This page holds no garment
 * photograph, so the colour law lets a cloth tone speak — but foundation §11D
 * says this page will one day carry *the richest process photography on the
 * site, on cream*, so the warm moment has to be the section that will never want
 * a picture in it. *You watch it happen* is the promise of photographs and
 * would have to give the colour back. Timeline honesty never will: it is one
 * proud sentence about slowness, which is exactly the "gentle block" §2 gives
 * tan.
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
			{/* `still` — the first thing on the page, which never rises. */}
			<Section still className="measure pt-10 md:pt-14">
				<h1 className="text-[clamp(2.375rem,7vw,3.625rem)] tracking-[-0.01em]">
					{copy.making.heading}
				</h1>
				<p className="mt-5 max-w-[62ch] text-lg text-(--ink-quiet) md:text-xl">
					{copy.making.opening}
				</p>
			</Section>

			<div className="measure mt-12">
				<Stitch />
			</div>

			{/*
			 * The four steps, in one Section rather than four.
			 *
			 * **Section-level, never paragraph-level** *(motion.md §3)* — four
			 * sections here would rise one after another as the reader came down the
			 * page, which is the long page twitching all the way down that the law
			 * exists to prevent. They are one movement and they arrive as one.
			 */}
			<Section className="measure mt-12">
				<ol className="flex list-none flex-col gap-11">
					{copy.making.steps.map((step, index) => (
						<li key={step.heading}>
							{/* The list's own ordinal, in the kicker the product page uses
							    for its small labels. A number, not a new string. */}
							<p className="kicker">{index + 1}</p>
							<h2 className="mt-2 font-serif text-2xl md:text-3xl">{step.heading}</h2>
							<p className="mt-3 max-w-[62ch] text-lg leading-relaxed">{step.body}</p>
						</li>
					))}
				</ol>
			</Section>

			{/* The trust masterstroke: he posts the photographs as he works. */}
			<Section className="measure mt-16">
				<h2 className="font-serif text-2xl md:text-3xl">{copy.making.photosHeading}</h2>
				<p className="mt-4 max-w-[62ch] text-lg leading-relaxed">{copy.making.photos}</p>
			</Section>

			{/*
			 * **The one warm moment on this page.** No garment here and none coming —
			 * see the note at the top of the file for why this section and not the
			 * photographs one.
			 */}
			<div className="measure mt-16">
				<Section tone="tan" garmentFree className="rounded-sm px-7 py-10 md:px-9">
					<h2 className="font-serif text-2xl md:text-3xl">{copy.making.timelineHeading}</h2>
					<p className="mt-4 max-w-[60ch] text-lg leading-relaxed">{copy.making.timeline}</p>
				</Section>
			</div>

			<Section className="measure mt-16">
				<h2 className="font-serif text-2xl md:text-3xl">{copy.making.fitHeading}</h2>
				<p className="mt-4 max-w-[62ch] text-lg leading-relaxed">{copy.making.fit}</p>

				{/*
				 * The list travels on its own, because the measurements path routes
				 * through a third person who sees none of the on-page instruction.
				 * `[per-garment list]` is founder homework and stays visible.
				 */}
				<h3 className="mt-10 font-serif text-xl md:text-2xl">{copy.making.tailorHeading}</h3>
				<p className="mt-3 max-w-[62ch] text-lg leading-relaxed">{copy.making.tailor}</p>
			</Section>

			<div className="measure mt-16">
				<Stitch />
			</div>

			{/*
			 * The fair statement. The last paragraph does the real work: it states the
			 * hard rule, then turns it into the reason the brand exists, so the reader
			 * finishes feeling privileged rather than warned.
			 *
			 * Left on cream deliberately. It is the page's most serious passage and
			 * the one carrying every unanswered `[X]`; a colour block around it would
			 * read as a warning notice rather than as a promise kept plainly.
			 */}
			<Section className="measure mt-12">
				<h2 className="font-serif text-2xl md:text-3xl">{copy.making.misfitHeading}</h2>
				<div className="mt-4 flex flex-col gap-5">
					{copy.making.misfit.map((paragraph) => (
						<p key={paragraph} className="max-w-[62ch] text-lg leading-relaxed">
							{paragraph}
						</p>
					))}
				</div>
			</Section>

			<Section className="measure mt-16 pb-4">
				<ul className="flex flex-col gap-3 leading-relaxed">
					<li>
						<Link href={path(locale, "collection")} className="stitch-link">
							{copy.making.collectionDoor}
						</Link>
					</li>
					<li>
						<Link href={path(locale, "policies")} className="stitch-link">
							{copy.making.policiesDoor}
						</Link>
					</li>
				</ul>
			</Section>
		</main>
	);
}
