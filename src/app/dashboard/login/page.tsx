import { auth } from "@/lib/auth";

import { requestLink, signInWithPassword } from "./actions";

/**
 * Step one of getting in: ask for the link.
 *
 * No JavaScript. The whole login is two server-rendered forms and two POSTs,
 * which is what makes it work in a mail app's in-app browser on a phone with a
 * bad connection — the only place it will ever actually be used.
 */
export default async function Login({
	searchParams,
}: {
	searchParams: Promise<{ sent?: string; e?: string; out?: string }>;
}) {
	const { sent, e, out } = await searchParams;
	const passwordOnly = await auth.passwordOnlyOpen();

	return (
		<main className="threshold">
			<div className="panel">
				<div className="threshold-head">
					<h1>Ubuntu</h1>
				</div>

				{/*
				 * The banners sit under the heading and above the form — the same
				 * order every screen in the dashboard uses, and it keeps the `h1`
				 * first in the document rather than behind whatever went wrong last.
				 *
				 * `.notice` is R4's, and none of these is `role="alert"`: every one
				 * arrives on a fresh page load after a redirect, and an alert role on
				 * a message that was already on screen when it opened interrupts a
				 * screen reader for news it is about to read anyway. The quiet variant
				 * is for the one that is not a problem.
				 */}
				{out === "all" && (
					<p className="notice notice-quiet">
						Signed out everywhere. Every session is closed, including this one.
					</p>
				)}

				{e === "rejected" && (
					<p className="notice">That did not work. Ask for a new link and try again.</p>
				)}
				{e === "undelivered" && (
					<p className="notice">The link could not be sent. Check the mail provider.</p>
				)}
				{e === "unconfigured" && (
					<p className="notice">
						Sign-in is not configured on this deployment. <code>SUPABASE_URL</code>,{" "}
						<code>SUPABASE_ANON_KEY</code>, <code>SUPABASE_SERVICE_ROLE_KEY</code>,{" "}
						<code>SESSION_SECRET</code>, <code>RESEND_API_KEY</code> and <code>EMAIL_FROM</code>{" "}
						are what it needs.
					</p>
				)}

				{sent ? (
					/*
					 * Deliberately the same sentence whether or not the address was his.
					 * There is one account; this screen is not a place to find out which
					 * address it uses.
					 *
					 * It replaces the form rather than sitting beside it, so it is the
					 * card's whole content and is set as such — not as a banner over a
					 * field he has already used.
					 */
					<p className="text-center">
						If that address is the one, a link is on its way. It asks for your password next.
					</p>
				) : (
					<form action={requestLink} method="post" className="fields">
						<div>
							<label htmlFor="email">Email</label>
							<input
								id="email"
								name="email"
								type="email"
								required
								autoComplete="username"
								inputMode="email"
							/>
						</div>
						<div className="form-actions">
							<button type="submit" className="btn-primary w-full">
								Send the link
							</button>
						</div>
					</form>
				)}
			</div>

			{/*
			 * The development escape hatch, and it says so on the screen.
			 *
			 * R12b is password *and* link, both, every login, and this is not a
			 * softening of it: `auth.passwordOnlyOpen()` is false unless
			 * `DEV_PASSWORD_LOGIN=open` and the request came over plain http, so
			 * this block cannot render on the deployed site and the action behind
			 * it refuses there regardless. It is labelled rather than hidden so
			 * that seeing it anywhere unexpected is immediately alarming.
			 */}
			{passwordOnly && (
				<section className="threshold-dev">
					<h2>Development sign-in</h2>
					<p className="meta mt-1 mb-3">
						Password only, no link. This appears because <code>DEV_PASSWORD_LOGIN</code> is open
						and this request is not over https. It never renders on the deployed site.
					</p>
					<form action={signInWithPassword} method="post" autoComplete="off" className="fields">
						<div>
							<label htmlFor="dev-email">Email</label>
							<input
								id="dev-email"
								name="email"
								type="email"
								required
								autoComplete="off"
								inputMode="email"
							/>
						</div>
						<div>
							<label htmlFor="dev-password">Password</label>
							<input
								id="dev-password"
								name="password"
								type="password"
								required
								autoComplete="new-password"
								data-1p-ignore
								data-lpignore="true"
							/>
						</div>
						{/*
						 * **Not the primary button**, and that is the whole of this
						 * round's change to the hatch. The filled one on this screen is
						 * *Send the link*; this is an outlined control inside a dashed box
						 * that says *development*. Nothing about when it renders moved.
						 */}
						<div className="form-actions">
							<button type="submit">Open the dashboard</button>
						</div>
					</form>
				</section>
			)}
		</main>
	);
}
