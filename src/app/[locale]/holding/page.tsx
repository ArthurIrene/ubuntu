import type { Metadata } from "next";
import HoldingPage from "@/components/holding-page";
import { content } from "@/content";
import { toLocale } from "@/lib/locale";

// What the gate serves. It never enters an index in either locale: it holds
// bracketed placeholders and exists only while the site is shut. This is
// unconditional and so overrides the layout's per-locale robots.
export const metadata: Metadata = {
	robots: { index: false, follow: false },
};

export default async function Holding({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	return <HoldingPage copy={content(toLocale(locale))} />;
}
