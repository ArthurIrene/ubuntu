import type { Metadata } from "next";
import Link from "next/link";

import { OrderContactFields, OrderRefusal } from "@/components/order-fields";
import { Section, Stitch } from "@/components/section";
import { fill } from "@/content";
import { formatMoney } from "@/emails/order";
import { siteSettings } from "@/lib/catalogue";
import { pageContext } from "@/lib/page";
import { path } from "@/lib/routes";

import { sendCommission } from "../actions";

/**
 * *Only yours* — the commissions page, at `/commissions`.
 *
 * **The one place on this site where the route and the label differ** *(R10)*: the
 * route stays `/commissions` because *only-yours* is a poor slug and a worse link
 * to paste into a message, and the label a customer reads is *Only yours*.
 *
 * Three movements: what this is, how it goes, what it costs. The first number on
 * the page is the **design fee** — a real figure for the first step filters harder
 * than a starting-from guess at a total nobody can yet quote, and it lets the page
 * say what it costs to *begin* *(R6)*.
 *
 * The form at the foot creates a commission order *(Phase 4)*. It asks for a
 * story, not a size: **fit arrives on the order page when the design is agreed**
 * *(R7)*, because there is nothing to cut yet.
 *
 * ── THE DESIGN IS INHERITED, NOT INVENTED ────────────────────────────────────
 *
 * Round 1's system, as the product page speaks it: the same measure, the same
 * serif headings, the same kicker, the same `Stitch`, the same `.field` /
 * `.ask` form primitives, and the same `OrderContactFields` the product page
 * posts with. No new class, token or component.
 *
 * **This page is an order form, and it holds the order form's contract.** No
 * JavaScript, no motion, a screen reader: a plain `<form>` to a Server Action,
 * real radios, every field labelled. The one thing added for this page is a full
 * rule around the two textareas — a field six rows tall with only a line beneath
 * it leaves the reader unsure where to type, and that is drawn with utilities on
 * existing tokens rather than a new primitive.
 *
 * **No priority option and no fit fork here**, and neither is an oversight.
 * Priority is a queue position and a commission is not queue-priced; fit is
 * settled with him once the design is agreed, on the tokenised order page, where
 * measurements are allowed to live *(R6, R7)*.
 *
 * **One warm block: *What this is*.** No garment photograph on this page, so the
 * colour law lets a cloth tone speak once — and *designed once, for one person,
 * and retired* is the sentence the whole tier rests on. It is on Udongo, the
 * third cloth colour and the one the site had not yet used; ink on udongo
 * measures 7.3:1. Everything else is cream and ink.
 *
 * *(Foundation §11F imagines this as a **dark page** with the scene-drawing
 * played in reverse — an empty ground line, a needle waiting. That drawing is a
 * sketched moment, propose-before-build, and a page-wide dark ground is a design
 * decision that should arrive with it rather than ahead of it.)*
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { copy } = await pageContext(params);
	return { title: copy.commissions.title };
}

export default async function Commissions({
	params,
	searchParams,
}: {
	params: Promise<{ locale: string }>;
	searchParams: Promise<{ e?: string }>;
}) {
	const { locale, copy } = await pageContext(params);
	const [settings, { e }] = await Promise.all([siteSettings(locale), searchParams]);

	/*
	 * **Zero is unanswered, not free.** The design fee is an absolute figure that
	 * must sit comfortably below the cheapest thing he would make, and the column
	 * defaults to zero because a money column has to default to something. A
	 * commission that begins for nothing is not a decision he has taken, so the
	 * bracket stays visible until he does — never invent the number.
	 */
	const fee =
		settings.designFee && settings.designFee > 0
			? formatMoney({ value: settings.designFee, currency: settings.currency })
			: "[X]";

	return (
		<main>
			{/* `still` — the first thing on the page, which never rises. */}
			<Section still className="measure pt-10 md:pt-14">
				<h1 className="text-[clamp(2.375rem,7vw,3.625rem)] tracking-[-0.01em]">
					{copy.commissions.heading}
				</h1>
				<p className="mt-5 max-w-[62ch] text-lg text-(--ink-quiet) md:text-xl">
					{copy.commissions.opening}
				</p>
			</Section>

			<div className="measure mt-12">
				<Stitch />
			</div>

			{/* **The one warm moment on this page.** */}
			<div className="measure mt-12">
				<Section tone="udongo" garmentFree className="rounded-sm px-7 py-10 md:px-9">
					<h2 className="font-serif text-2xl md:text-3xl">
						{copy.commissions.whatThisIsHeading}
					</h2>
					<p className="mt-4 max-w-[58ch] text-lg leading-relaxed">
						{copy.commissions.whatThisIs}
					</p>
				</Section>
			</div>

			<Section className="measure mt-16">
				<h2 className="font-serif text-2xl md:text-3xl">{copy.commissions.howItGoesHeading}</h2>
				<p className="mt-4 max-w-[62ch] text-lg leading-relaxed">{copy.commissions.howItGoes}</p>

				{/*
				 * **Three moments, and never the word deposit** *(R6)*. Never a
				 * starting-from price either: a commission has no total until the scene
				 * exists, so the only honest number on this page is what it costs to
				 * begin.
				 */}
				<h3 className="mt-10 font-serif text-xl md:text-2xl">{copy.commissions.moneyHeading}</h3>
				<ol className="mt-5 flex list-none flex-col gap-5">
					{copy.commissions.moneyMoments.map((moment, index) => (
						<li key={moment}>
							{/* The list's own ordinal, in the kicker the site uses for its
							    small labels. A number, not a new string. */}
							<p className="kicker">{index + 1}</p>
							<p className="mt-1 max-w-[62ch] text-lg leading-relaxed">{moment}</p>
						</li>
					))}
				</ol>

				{/* Ownership, stated on the page rather than discovered *(R6)*. */}
				<p className="mt-8 max-w-[62ch] text-lg leading-relaxed">{copy.commissions.ownership}</p>
			</Section>

			<Section className="measure mt-16">
				<h2 className="font-serif text-2xl md:text-3xl">{copy.commissions.costHeading}</h2>
				<p className="mt-4 max-w-[62ch] text-(--ink-quiet)">{copy.commissions.cost}</p>
				{/* The first real number on the page, so it carries the weight of the
				    passage rather than sitting inside it. */}
				<p className="mt-5 max-w-[62ch] text-lg leading-relaxed">
					{fill(copy.commissions.fee, { fee })}
				</p>
			</Section>

			<div className="measure mt-16">
				<Stitch />
			</div>

			{/*
			 * The form. It asks for a story, not a size — no measurements here,
			 * because asking sleeve length next to someone's grandmother's story would
			 * break the spell, and fit is settled with him after the design is agreed
			 * *(R7)*.
			 *
			 * **No image field**, deliberately: an anonymous upload box is the most
			 * attackable surface on a site with no accounts. Reference images unlock on
			 * the tokenised order page once he has accepted *(Phase 8)*.
			 *
			 * No JavaScript is involved in any of it. The action redirects to the new
			 * order's own page, or back here with the refusal.
			 */}
			<Section className="measure mt-12">
				<h2 className="font-serif text-2xl leading-tight md:text-3xl">
					{copy.commissions.formHeading}
				</h2>

				<OrderRefusal error={e} copy={copy.order} />

				<form action={sendCommission}>
					{/*
					 * The labels travel with the answers. Their three replies are kept as
					 * one passage of their own words and shown back to them during the
					 * design window, so the words that introduced each one belong with
					 * them rather than being reconstructed later in whichever language
					 * happens to be rendering.
					 */}
					<input type="hidden" name="labelScene" value={copy.commissions.scene} />
					<input type="hidden" name="labelGarment" value={copy.commissions.garment} />
					<input type="hidden" name="labelAnythingElse" value={copy.commissions.anythingElse} />

					<p className="field mt-6">
						<label htmlFor="scene" className="text-sm">
							{copy.commissions.scene}
						</label>
						{/*
						 * A full rule rather than the single-line fields' underline. Six
						 * rows with only a line beneath them reads as an empty gap, and
						 * this is the field the whole page is asking for.
						 */}
						<textarea
							id="scene"
							name="scene"
							rows={6}
							placeholder={copy.commissions.scenePrompt}
							required
							className="field-input rounded-sm border border-(--canvas-edge) px-3 py-2.5"
						/>
					</p>

					<p className="field mt-6 max-w-104">
						<label htmlFor="garment" className="text-sm">
							{copy.commissions.garment}
						</label>
						<input
							id="garment"
							name="garment"
							type="text"
							placeholder={copy.commissions.garmentUnsure}
							className="field-input"
						/>
					</p>

					<OrderContactFields locale={locale} copy={copy.order.form} />

					<p className="field mt-8">
						<label htmlFor="anything-else" className="text-sm">
							{copy.commissions.anythingElse}
						</label>
						<textarea
							id="anything-else"
							name="anythingElse"
							rows={3}
							className="field-input rounded-sm border border-(--canvas-edge) px-3 py-2.5"
						/>
					</p>

					<p className="mt-6 max-w-[58ch] text-sm text-(--ink-quiet)">
						{copy.commissions.noImages}
					</p>

					{/* **Never anything else.** */}
					<p className="mt-10">
						<button type="submit" className="ask">
							{copy.commissions.button}
						</button>
					</p>
				</form>

				{/* Reply time is qualitative here and numeric everywhere else — this
				    line deliberately does not read the dashboard field. */}
				<p className="mt-7 max-w-[58ch] leading-relaxed text-(--ink-quiet)">
					{copy.commissions.beneathButton}
				</p>
			</Section>

			{/*
			 * The soft exit. `pb-16` rather than the product page's `pb-4` because
			 * this door is a single full-width sentence: its own stitch runs the
			 * whole measure, and the footer opens with a stitch of its own, so at
			 * four the two rules stack into what reads as one double line.
			 */}
			<Section className="measure mt-16 pb-16">
				<p className="leading-relaxed">
					<Link href={path(locale, "collection")} className="stitch-link">
						{copy.commissions.exit}
					</Link>
				</p>
			</Section>
		</main>
	);
}
