import type { Metadata } from "next";
import { eq } from "drizzle-orm";

import { getDb, schema } from "@/db/client";
import { toLocale } from "@/lib/locale";

import "../../globals.css";

/**
 * The order page's own root layout.
 *
 * **Outside `[locale]`, and that is deliberate.** The public tree takes its
 * language from the URL because a stranger chooses it by walking there. A
 * customer does not choose: `orders.locale` was set when they placed the order
 * and every email since has been selected by it, so the page their link opens
 * has to answer in the same language — not in whichever one the path implies.
 * There is no `/rw/o/<token>`, and there should not be: **the token is the whole
 * address** *(R5)*.
 *
 * It sits at `[token]` rather than at `/o` so that `lang` can be read from the
 * order. That is one indexed lookup on a column with a unique index, on the same
 * per-request connection the page below uses.
 */
export const dynamic = "force-dynamic";

/**
 * **`noindex, nofollow`, unconditionally** *(R5)*.
 *
 * The path *is* the credential, so an indexed order page is a published
 * password. The matching `Referrer-Policy: no-referrer` is set in the middleware
 * — it has to be a response header, and it has to cover the private image
 * stream as well as this page, which a metadata block cannot reach.
 */
export const metadata: Metadata = {
	robots: { index: false, follow: false },
};

export default async function OrderLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ token: string }>;
}) {
	const { token } = await params;
	const db = await getDb();

	const [order] = await db
		.select({ locale: schema.orders.locale })
		.from(schema.orders)
		.where(eq(schema.orders.token, token))
		.limit(1);

	// An unknown token renders the English shell around the page's own 404. It
	// tells a stranger nothing: a wrong token and a well-formed one that answers
	// to nothing look identical, which is the point.
	return (
		<html lang={toLocale(order?.locale ?? "en")}>
			<head>
				<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
				{/*
				 * **No analytics beacon on an order route, ever** *(R5)*. Page-view
				 * analytics on this path would file every live token in a third
				 * party's table. There is none on the site yet; this comment is here
				 * so that the day one is added, it is added somewhere else.
				 */}
			</head>
			<body className="antialiased">{children}</body>
		</html>
	);
}
