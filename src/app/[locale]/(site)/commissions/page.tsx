import type { Metadata } from "next";

import { pageContext } from "@/lib/page";

/**
 * *Only yours* — the commissions page, at `/commissions`.
 *
 * **The one place on this site where the route and the label differ** *(R10)*: the
 * route stays `/commissions` because *only-yours* is a poor slug and a worse link
 * to paste into a message, and the label a customer reads is *Only yours*.
 *
 * This phase builds the read side — the pitch, the three movements, the design
 * fee. The form that creates an order is Phase 4.
 */
export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { copy } = await pageContext(params);
	return { title: copy.commissions.title };
}

export default async function Commissions({ params }: { params: Promise<{ locale: string }> }) {
	const { copy } = await pageContext(params);

	return (
		<main>
			<h1>{copy.commissions.heading}</h1>
			<p>{copy.commissions.opening}</p>
		</main>
	);
}
