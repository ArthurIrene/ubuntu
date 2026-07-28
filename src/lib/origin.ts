// Where this request thinks it is.
//
// Taken from the request rather than configured. A configured origin is one
// more value to get wrong, and getting it wrong sends the deployed site's
// sign-in link — or a customer's order link — to `localhost`.

import { headers } from "next/headers";

/** `https://ubuntu.rw`, or `http://localhost:8788` under `pnpm preview`. */
export async function siteOrigin(): Promise<string> {
	const header = await headers();
	const host = header.get("host") ?? "localhost:3000";
	const forwarded = (header.get("x-forwarded-proto") ?? "").split(",")[0].trim();
	const scheme =
		forwarded ||
		(host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
	return `${scheme}://${host}`;
}

/**
 * The page a customer reaches for their order.
 *
 * **The token is the credential** *(R5)*. This is the only place the URL is
 * composed, and its result goes into an email body or a `wa.me` draft and
 * nowhere else — never a log, never an error, and never a dashboard screen
 * *(R12d)*.
 */
export async function orderLink(token: string): Promise<string> {
	return `${await siteOrigin()}/o/${token}`;
}
