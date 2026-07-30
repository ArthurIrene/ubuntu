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
 * sentence, with no country branch *(R15, amended)*.
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

	return (
		<main>
			<h1>{copy.policies.heading}</h1>
			<p>{copy.policies.opening}</p>
		</main>
	);
}
