import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { content } from "@/content";
import { fontVariables } from "@/lib/fonts";
import { LOCALES, toLocale } from "@/lib/locale";
import { ARM, SCAN } from "@/motion/reveal";
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
		// The three faces arrive as CSS variables; `globals.css` decides which is
		// used where. Nothing below has to import a font to have one.
		<html lang={locale} className={fontVariables}>
			<head>
				<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
				{/*
				 * Arms the scroll reveals before the first paint, and only where
				 * motion is wanted and observable. **With no JavaScript this never
				 * runs and every section is simply visible** — the CSS hides nothing
				 * that this attribute has not armed.
				 */}
				<script dangerouslySetInnerHTML={{ __html: ARM }} />
			</head>
			<body className="antialiased">
				{children}
				{/*
				 * Last in the body on purpose: the document is parsed, and the
				 * browser has not yet painted it. Anything later — `DOMContentLoaded`,
				 * a `useEffect` — reveals a section that has already been shown as a
				 * blank gap.
				 */}
				<script dangerouslySetInnerHTML={{ __html: SCAN }} />
			</body>
		</html>
	);
}
