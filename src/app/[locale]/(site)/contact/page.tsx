import type { Metadata } from "next";

import { pageContext } from "@/lib/page";

/**
 * `/contact` — *Talk to us*.
 *
 * **Its job is to route, not to be reachable** *(R10, foundation §11I)*. It sits in
 * the footer beside Policies and is deliberately not in the nav: a contact link in
 * the nav is exactly what quietly competes with the order form.
 *
 * Specified in two documents with a URL in neither until the pre-build review,
 * which is why R10 wrote it down and gave it this phase.
 */
export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { copy } = await pageContext(params);
	return { title: copy.contact.title };
}

export default async function Contact({ params }: { params: Promise<{ locale: string }> }) {
	const { copy } = await pageContext(params);

	return (
		<main>
			<h1>{copy.contact.heading}</h1>
			<p>{copy.contact.opening}</p>
		</main>
	);
}
