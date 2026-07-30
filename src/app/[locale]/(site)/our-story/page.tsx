import type { Metadata } from "next";

import { pageContext } from "@/lib/page";

/**
 * *Our story*, at `/our-story`.
 *
 * A descent from the widest circle to the smallest: philosophy → brand → maker →
 * community. Readable in three minutes; depth through precision, not length.
 *
 * It is the page that **names and celebrates the makers**, which is why the maker
 * is a table with an FK rather than a string typed on each order *(R16)* — the
 * join arrives with the rest of the page's content.
 */
export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { copy } = await pageContext(params);
	return { title: copy.story.title };
}

export default async function OurStory({ params }: { params: Promise<{ locale: string }> }) {
	const { copy } = await pageContext(params);

	return (
		<main>
			<h1>{copy.story.heading}</h1>
			<h2>{copy.story.philosophyHeading}</h2>
			{copy.story.philosophy.map((paragraph) => (
				<p key={paragraph}>{paragraph}</p>
			))}
		</main>
	);
}
