import type { Metadata } from "next";
import Link from "next/link";

import { OrderContactFields, OrderRefusal } from "@/components/order-fields";
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
			<h1>{copy.commissions.heading}</h1>
			<p>{copy.commissions.opening}</p>

			<section>
				<h2>{copy.commissions.whatThisIsHeading}</h2>
				<p>{copy.commissions.whatThisIs}</p>
			</section>

			<section>
				<h2>{copy.commissions.howItGoesHeading}</h2>
				<p>{copy.commissions.howItGoes}</p>

				{/* Three moments, and never the word deposit. */}
				<h3>{copy.commissions.moneyHeading}</h3>
				<ol>
					{copy.commissions.moneyMoments.map((moment) => (
						<li key={moment}>{moment}</li>
					))}
				</ol>
				<p>{copy.commissions.ownership}</p>
			</section>

			<section>
				<h2>{copy.commissions.costHeading}</h2>
				<p>{copy.commissions.cost}</p>
				<p>{fill(copy.commissions.fee, { fee })}</p>
			</section>

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
			<section>
				<h2>{copy.commissions.formHeading}</h2>

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

					<p>
						<label htmlFor="scene">{copy.commissions.scene}</label>
						<textarea
							id="scene"
							name="scene"
							rows={6}
							placeholder={copy.commissions.scenePrompt}
							required
						/>
					</p>
					<p>
						<label htmlFor="garment">{copy.commissions.garment}</label>
						<input
							id="garment"
							name="garment"
							type="text"
							placeholder={copy.commissions.garmentUnsure}
						/>
					</p>

					<OrderContactFields locale={locale} copy={copy.order.form} />

					<p>
						<label htmlFor="anything-else">{copy.commissions.anythingElse}</label>
						<textarea id="anything-else" name="anythingElse" rows={3} />
					</p>

					<p>{copy.commissions.noImages}</p>

					{/* **Never anything else.** */}
					<p>
						<button type="submit">{copy.commissions.button}</button>
					</p>
				</form>

				{/* Reply time is qualitative here and numeric everywhere else — this
				    line deliberately does not read the dashboard field. */}
				<p>{copy.commissions.beneathButton}</p>
			</section>

			<p>
				<Link href={path(locale, "collection")}>{copy.commissions.exit}</Link>
			</p>
		</main>
	);
}
