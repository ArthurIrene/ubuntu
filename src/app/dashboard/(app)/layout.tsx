import Link from "next/link";

import { requireSession } from "@/lib/auth";

import { signOut, signOutEverywhere } from "../login/actions";

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
		<>
			<header>
				<nav aria-label="Dashboard">
					<ul>
						<li>
							<Link href="/dashboard">Today</Link>
						</li>
						<li>
							<Link href="/dashboard/orders">Orders</Link>
						</li>
						<li>
							<Link href="/dashboard/pieces">Pieces</Link>
						</li>
						<li>
							<Link href="/dashboard/settings">Settings</Link>
						</li>
					</ul>
				</nav>
			</header>

			{children}

			<footer>
				<form action={signOut}>
					<button type="submit">Sign out</button>
				</form>
				{/*
				 * The kill switch, reachable from every screen because the moment it
				 * is wanted is the moment nobody wants to go looking for it. It is
				 * line one of the incident plan on paper.
				 */}
				<form action={signOutEverywhere}>
					<button type="submit">Sign out everywhere</button>
				</form>
			</footer>
		</>
	);
}
