import type { Metadata } from "next";

import { pageContext } from "@/lib/page";

/**
 * The collection.
 *
 * **Sorts newest-first, and is the permanent answer to "what's new"** *(R10)* —
 * one stable URL he can post every time he finishes something, which never goes
 * stale and never sits empty. There is no `/new`: with four pieces it would be
 * this page with a different heading, and it would have to be maintained.
 *
 * Never "drop." A drop implies the thing goes away, and nothing here does.
 *
 * The grid and its card-fields-only query arrive next.
 */
export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { copy } = await pageContext(params);
	return { title: copy.collection.title };
}

export default async function Collection({ params }: { params: Promise<{ locale: string }> }) {
	const { copy } = await pageContext(params);

	return (
		<main>
			<p>{copy.collection.kicker}</p>
			<h1>{copy.collection.heading}</h1>
			<p>{copy.collection.bridge}</p>
		</main>
	);
}
