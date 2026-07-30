import type { Metadata } from "next";

import { pageContext } from "@/lib/page";

/**
 * *The making* — promoted from a homepage section to its own page, because people
 * return to it at different moments.
 *
 * It carries the four steps with the honest *why* at each, the progress-photo
 * promise, the fit system, the fit policy stated fairly, and timeline honesty:
 * hand-stitching means weeks, said proudly.
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
	const { copy } = await pageContext(params);

	return (
		<main>
			<h1>{copy.making.heading}</h1>
			<p>{copy.making.opening}</p>
		</main>
	);
}
