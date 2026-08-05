import { requireSession } from "@/lib/auth";

import { signOut, signOutEverywhere } from "../login/actions";
import DashboardNav from "./nav";

/**
 * The gate, and the four sections.
 *
 * **Every dashboard request passes `requireSession()`**, which reads the
 * cookie, verifies it and compares its issue time against
 * `sessions_valid_after` on the admin row — the third of those being what makes
 * *sign out everywhere* instant rather than eventual *(R12c)*.
 *
 * A layout is not a security boundary on its own: it does not re-run for a
 * server action. So every action calls the same gate rather than trusting that
 * the page which rendered its form was allowed to. This is belt and braces on
 * purpose — the alternative is one forgotten `await` between a stranger and
 * every live order token.
 *
 * **Four sections — Today · Orders · Pieces · Settings** *(R9b, as amended).*
 * Customers was cut; the customer row exists and every FK resolves. Garment
 * types and the makers list live inside Settings.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
	await requireSession();

	return (
		<div className="dash-shell">
			{/*
			 * **Sticky, and dark.** Sticky because the order screen is long and the
			 * four sections should not cost a scroll back to the top; dark because
			 * the one thing the frame has to say before anything else is *this is
			 * the workshop, not the shop.* It is the only place ink is a ground.
			 */}
			<header className="dash-bar">
				<div className="dash-bar-inner">
					<DashboardNav />
				</div>
			</header>

			{/*
			 * A `div`, not a `main`: every screen below renders its own `<main>`,
			 * and a document has one. This is the column they sit in.
			 */}
			<div className="dash-main">{children}</div>

			<footer className="dash-foot">
				<div className="dash-foot-inner">
					<form action={signOut}>
						<button type="submit" className="btn-small">
							Sign out
						</button>
					</form>
					{/*
					 * The kill switch, reachable from every screen because the moment it
					 * is wanted is the moment nobody wants to go looking for it. It is
					 * line one of the incident plan on paper.
					 *
					 * Styled as an ending rather than as a button beside it: it closes
					 * every session he has, and it sits next to the one that closes this
					 * browser's.
					 */}
					<form action={signOutEverywhere}>
						<button type="submit" className="btn-small btn-ending">
							Sign out everywhere
						</button>
					</form>
				</div>
			</footer>
		</div>
	);
}
