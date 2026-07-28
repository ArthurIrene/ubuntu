import type { Metadata } from "next";

import "../globals.css";

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
	return (
		<html lang="en">
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
			<body>{children}</body>
		</html>
	);
}
