import { redirect } from "next/navigation";

import { redeemLinkAction } from "./actions";

/**
 * Where a re-auth link lands *(R12b)*.
 *
 * Same shape as the login's verify page and for the same reason: **rendering
 * this grants nothing.** The link is redeemed on the POST, so a mail scanner or
 * a link-preview bot cannot spend it before he taps.
 *
 * It asks for no password. The password is what proves *who*, and he has already
 * proved that — this proves he still holds the mailbox, which is the thing an
 * ownership change is actually defending.
 */
export default async function VerifyReauth({
	searchParams,
}: {
	searchParams: Promise<{ t?: string }>;
}) {
	const { t } = await searchParams;
	if (!t) redirect("/dashboard/settings");

	return (
		<main>
			<h1>A fresh link</h1>
			<p>This unlocks the two addresses for ten minutes, and nothing else.</p>
			<form action={redeemLinkAction} method="post">
				<input type="hidden" name="t" value={t} />
				<button type="submit">Continue</button>
			</form>
		</main>
	);
}
