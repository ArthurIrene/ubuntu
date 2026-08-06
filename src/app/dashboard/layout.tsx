import type { Metadata } from "next";

import { sans } from "@/lib/fonts";

import "../globals.css";
import "./dashboard.css";

/**
 * The dashboard's own root layout.
 *
 * **Off the public tree and outside `[locale]`** — one language, no locale
 * segment, no switcher. The public site is bilingual because customers are;
 * there is one founder and he reads English.
 *
 * It is a second root layout rather than a nested one for the same reason: the
 * public tree's root sets `lang` from the route, and the dashboard has no route
 * to set it from.
 */
export const metadata: Metadata = {
	title: "Ubuntu",
	// Never indexed, never followed, under any circumstance. This is not a page
	// that should be discoverable, and the login screen is the most useful thing
	// on the site to a stranger.
	robots: { index: false, follow: false },
};

export default function DashboardRootLayout({ children }: { children: React.ReactNode }) {
	// **Only the sans is asked for here.**
	//
	// `fontVariables` would carry all four faces, and three of them have no
	// business on a data-entry screen: the serif and its italic are the shop's
	// voice, and the script is a wordmark that does not exist yet. The variable
	// set below is the one `--font-sans` reads, so every heading and every field
	// in the dashboard is Instrument Sans — and nothing else is fetched.
	//
	// `.dash` on the body is what scopes `dashboard.css`. It is set once, here,
	// and it covers the login screens as well as the four sections: they are the
	// same tool, and the first thing he ever sees of it.
	return (
		<html lang="en" className={sans.variable}>
			<head>
				{/*
				 * Pinnable to the home screen *(R12c)* — a manifest scoped to the
				 * dashboard routes only, linked from here and nowhere else, so the
				 * public site never advertises an installable app.
				 *
				 * **No service worker.** An offline work queue showing stale orders
				 * and firing emails on reconnect is a correctness problem, not a
				 * feature. A pinned instance keeps its own cookie jar, which is the
				 * third argument for the revocation column rather than a reason to
				 * cache anything here.
				 */}
				<link rel="manifest" href="/dashboard/manifest.webmanifest" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
			</head>
			<body className="dash">{children}</body>
		</html>
	);
}
