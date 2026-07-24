import HoldingPage from "@/components/holding-page";
import { content } from "@/content";
import { toLocale } from "@/lib/locale";

// The landing route. No robots directive of its own, so it inherits the
// layout's: English indexable, Kinyarwanda noindex until the switcher flips.
export default async function Home({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	return <HoldingPage copy={content(toLocale(locale))} />;
}
