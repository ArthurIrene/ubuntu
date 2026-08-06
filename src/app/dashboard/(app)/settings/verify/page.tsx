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

	/*
	 * **This one keeps the frame, and that is not an oversight.**
	 *
	 * It lives under `(app)`, so `requireSession()` runs above it: unlike the two
	 * login screens, he is *already signed in* here and this is a step-up, not a
	 * threshold. Lifting it out of the group to match them would take the session
	 * gate off it, which is an auth change and not a styling one. So it takes the
	 * threshold's card and centring inside the column the rest of the dashboard
	 * uses, and keeps the nav — which is right, because leaving without redeeming
	 * is a thing he is allowed to do.
	 */
	return (
		<main className="mx-auto max-w-96 py-8">
			<div className="panel">
				<div className="threshold-head">
					<h1>A fresh link</h1>
					<p className="meta">This unlocks the two addresses for ten minutes, and nothing else.</p>
				</div>
				<form action={redeemLinkAction} method="post">
					<input type="hidden" name="t" value={t} />
					<button type="submit" className="btn-primary w-full">
						Continue
					</button>
				</form>
			</div>
		</main>
	);
}
