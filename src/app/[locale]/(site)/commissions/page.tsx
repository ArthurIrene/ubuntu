import type { Metadata } from "next";
import Link from "next/link";

import { fill } from "@/content";
import { formatMoney } from "@/emails/order";
import { siteSettings } from "@/lib/catalogue";
import { pageContext } from "@/lib/page";
import { path } from "@/lib/routes";

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
 * This phase builds the read side. The form below renders and cannot submit;
 * Phase 4 is what creates an order.
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

export default async function Commissions({ params }: { params: Promise<{ locale: string }> }) {
	const { locale, copy } = await pageContext(params);
	const settings = await siteSettings(locale);

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
			 * Where Phase 4's form mounts. It asks for a story, not a size — no
			 * measurements here, because asking sleeve length next to someone's
			 * grandmother's story would break the spell, and fit is settled with him
			 * after the design is agreed.
			 *
			 * **No image field**, deliberately: an anonymous upload box is the most
			 * attackable surface on a site with no accounts. Reference images unlock on
			 * the tokenised order page once he has accepted *(Phase 8)*.
			 *
			 * Not a `<form>`: with no action it would submit itself back to this page
			 * on Enter. Inert fields, disabled button, and Phase 4 replaces the whole
			 * block.
			 */}
			<section>
				<h2>{copy.commissions.formHeading}</h2>

				<p>
					<label htmlFor="scene">{copy.commissions.scene}</label>
					<textarea id="scene" placeholder={copy.commissions.scenePrompt} disabled />
				</p>
				<p>
					<label htmlFor="garment">{copy.commissions.garment}</label>
					<input id="garment" type="text" placeholder={copy.commissions.garmentUnsure} disabled />
				</p>
				<p>
					<label htmlFor="name">{copy.commissions.name}</label>
					<input id="name" type="text" disabled />
				</p>
				{/* **Email and phone are both required on an order.** Email is the
				    automated rail; phone is delivery and his own hand. */}
				<p>
					<label htmlFor="email">{copy.commissions.email}</label>
					<input id="email" type="email" disabled />
				</p>
				<p>
					<label htmlFor="phone">{copy.commissions.phone}</label>
					<input id="phone" type="tel" disabled />
				</p>
				<p>
					<label htmlFor="anything-else">{copy.commissions.anythingElse}</label>
					<textarea id="anything-else" disabled />
				</p>

				{/* Said rather than discovered: the email fires whichever channel they
				    pick, because the link has to outlast a cleared chat. */}
				<h3>{copy.commissions.channelHeading}</h3>
				<p>{copy.commissions.channelNote}</p>
				<p>{copy.commissions.noImages}</p>

				<p>
					<button type="button" disabled>
						{copy.commissions.button}
					</button>
				</p>
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
