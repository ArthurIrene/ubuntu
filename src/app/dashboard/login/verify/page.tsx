import { redirect } from "next/navigation";

import { completeLogin } from "../actions";

/**
 * Step two: the password, on the device that opened the link.
 *
 * **Rendering this page grants nothing and consumes nothing.** The link is
 * verified on the POST below, not here — a link that granted something by being
 * fetched would be spent by the first mail scanner or link-preview bot that
 * touched it, and he would arrive to a dead link every time.
 */
export default async function Verify({
	searchParams,
}: {
	searchParams: Promise<{ t?: string }>;
}) {
	const { t } = await searchParams;
	if (!t) redirect("/dashboard/login");

	return (
		<main>
			<h1>Your password</h1>
			<p>The link is good. This is the half your phone does not carry.</p>

			{/*
			 * `autoComplete="off"` and `new-password` are R12b's condition, written
			 * down rather than assumed: **the password is never saved in the
			 * browser.** If autofill holds it, the device contains both factors
			 * again and the entire gain of asking for two disappears.
			 */}
			<form action={completeLogin} method="post" autoComplete="off">
				<input type="hidden" name="t" value={t} />
				<label htmlFor="password">Password</label>
				<input
					id="password"
					name="password"
					type="password"
					required
					autoComplete="new-password"
					data-1p-ignore
					data-lpignore="true"
				/>
				<button type="submit">Open the dashboard</button>
			</form>
		</main>
	);
}
