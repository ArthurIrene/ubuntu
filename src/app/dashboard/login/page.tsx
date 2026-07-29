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
		<main>
			<h1>Ubuntu</h1>

			{out === "all" && <p>Signed out everywhere. Every session is closed, including this one.</p>}

			{e === "rejected" && <p>That did not work. Ask for a new link and try again.</p>}
			{e === "undelivered" && <p>The link could not be sent. Check the mail provider.</p>}
			{e === "unconfigured" && (
				<p>
					Sign-in is not configured on this deployment. <code>SUPABASE_URL</code>,{" "}
					<code>SUPABASE_ANON_KEY</code>, <code>SUPABASE_SERVICE_ROLE_KEY</code>,{" "}
					<code>SESSION_SECRET</code>, <code>RESEND_API_KEY</code> and <code>EMAIL_FROM</code> are
					what it needs.
				</p>
			)}

			{sent ? (
				/*
				 * Deliberately the same sentence whether or not the address was his.
				 * There is one account; this screen is not a place to find out which
				 * address it uses.
				 */
				<p>If that address is the one, a link is on its way. It asks for your password next.</p>
			) : (
				<form action={requestLink} method="post">
					<label htmlFor="email">Email</label>
					<input
						id="email"
						name="email"
						type="email"
						required
						autoComplete="username"
						inputMode="email"
					/>
					<button type="submit">Send the link</button>
				</form>
			)}

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
				<section>
					<h2>Development sign-in</h2>
					<p>
						Password only, no link. This appears because <code>DEV_PASSWORD_LOGIN</code> is open
						and this request is not over https. It never renders on the deployed site.
					</p>
					<form action={signInWithPassword} method="post" autoComplete="off">
						<label htmlFor="dev-email">Email</label>
						<input
							id="dev-email"
							name="email"
							type="email"
							required
							autoComplete="off"
							inputMode="email"
						/>
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
						<button type="submit">Open the dashboard</button>
					</form>
				</section>
			)}
		</main>
	);
}
