"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The four sections, and which one he is in.
 *
 * **The only client component in the dashboard frame, and it exists for one
 * attribute.** Knowing where you are is the cheapest thing a tool can tell you
 * and the first thing an unstyled one cannot. There is no other way to read the
 * current path from a layout: a layout takes no props from the page below it,
 * and the pathname is not a header.
 *
 * It costs nothing when the script does not arrive. The component is rendered on
 * the server like every other, `aria-current` is in that HTML, and the four
 * items are ordinary links — **navigation here never depends on JavaScript.**
 *
 * `startsWith` for the three sections that have screens beneath them, exact for
 * Today, which is the root and would otherwise match everything.
 */
const SECTIONS = [
	{ href: "/dashboard", label: "Today", exact: true },
	{ href: "/dashboard/orders", label: "Orders", exact: false },
	{ href: "/dashboard/pieces", label: "Pieces", exact: false },
	{ href: "/dashboard/settings", label: "Settings", exact: false },
];

export default function DashboardNav() {
	const pathname = usePathname();

	return (
		<nav aria-label="Dashboard" className="dash-nav">
			<ul>
				{SECTIONS.map((section) => {
					const here = section.exact
						? pathname === section.href
						: pathname.startsWith(section.href);

					return (
						<li key={section.href}>
							<Link href={section.href} aria-current={here ? "page" : undefined}>
								{section.label}
							</Link>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
