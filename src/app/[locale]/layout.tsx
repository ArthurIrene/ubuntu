import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { content } from "@/content";
import { LOCALES, toLocale } from "@/lib/locale";
import "../globals.css";

// Both locales prerender. English is unprefixed at the root, Kinyarwanda at
// /rw — the middleware rewrites "/" to "/en" so the address bar never shows it.
export function generateStaticParams() {
	return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await params;
	return {
		title: content(toLocale(locale)).title,
		// Kinyarwanda is walkable but unlinked and unindexed until the switcher
		// flips. English carries no robots directive here, so it is indexable.
		...(toLocale(locale) === "rw"
			? { robots: { index: false, follow: false } }
			: {}),
	};
}

export default async function LocaleLayout({
	children,
	params,
}: Readonly<{
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}>) {
	const { locale } = await params;
	// Only "en" and "rw" exist. generateStaticParams prerenders both; anything
	// else is a 404 rather than an on-demand render of an unknown locale.
	if (!(LOCALES as readonly string[]).includes(locale)) notFound();
	return (
		<html lang={locale}>
			<head>
				<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
			</head>
			<body className="antialiased">{children}</body>
		</html>
	);
}
