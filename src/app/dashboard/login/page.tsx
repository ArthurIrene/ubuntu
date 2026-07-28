import { requestLink } from "./actions";

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
		</main>
	);
}
