import type { Metadata } from "next";

import { pageContext } from "@/lib/page";

/**
 * The policy page.
 *
 * It states three causes of misfit with three different owners, because a single
 * rule covering all fit issues would silently cover his mistakes too — and that is
 * the kind of thing a customer discovers once and tells everyone about.
 *
 * The duties clause and the alteration contribution state both cases in one
 * sentence, with no country branch *(R15, amended)*: a country-conditional variant
 * is a request-time branch on an edge-cached public page, needing country in the
 * cache key and a country field on a form that has none, to serve one clause.
 *
 * Every `[X]` here is an unanswered founder question and stays visible. Three of
 * them are the same number in three places — the contribution toward a local
 * alteration outside Rwanda — and it is the one that decides whether the brand can
 * honestly sell to London.
 */
export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { copy } = await pageContext(params);
	return { title: copy.policies.title };
}

export default async function Policies({ params }: { params: Promise<{ locale: string }> }) {
	const { copy } = await pageContext(params);

	const clauses = [
		{ heading: copy.policies.fitHeading, body: copy.policies.fit },
		{ heading: copy.policies.alterationHeading, body: copy.policies.alteration },
		{ heading: copy.policies.deliveryHeading, body: copy.policies.delivery },
		{ heading: copy.policies.makingHeading, body: copy.policies.making },
		{ heading: copy.policies.handsHeading, body: copy.policies.hands },
		{ heading: copy.policies.detailsHeading, body: copy.policies.details },
		{ heading: copy.policies.stoppingHeading, body: copy.policies.stopping },
		{ heading: copy.policies.commissionHeading, body: copy.policies.commission },
		{ heading: copy.policies.commissionMoneyHeading, body: copy.policies.commissionMoney },
	];

	return (
		<main>
			<h1>{copy.policies.heading}</h1>
			<p>{copy.policies.opening}</p>

			{clauses.map((clause) => (
				<section key={clause.heading}>
					<h2>{clause.heading}</h2>
					<p>{clause.body}</p>
				</section>
			))}
		</main>
	);
}
