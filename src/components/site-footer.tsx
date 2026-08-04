import Link from "next/link";

import { Stitch } from "@/components/section";
import type { Content } from "@/content/en";
import type { Locale } from "@/lib/locale";
import { path } from "@/lib/routes";

/**
 * The footer, which is where **Policies and Talk to us** live *(R10)*.
 *
 * > *Sits under the running-stitch divider, so the page ends on the site's own
 * > heartbeat.* *(copy.md §7)*
 *
 * **The one closing mark.** The handwritten script gets its single non-logo
 * appearance here — the site opens with the signature and closes with it at
 * rest. One per page, and this is it, which is why no page below may reach for
 * `font-script` again.
 *
 * The philosophy line sits at the bottom of every page so that it underwrites
 * the whole site without being repeated in body copy. It is set in the serif
 * italic, which is one of exactly two places that face is used.
 *
 * **WhatsApp is never in the global footer** — it appears on `/contact` and on
 * order pages only. A footer button is a permanent invitation to leave the site.
 */
export default function SiteFooter({ locale, copy }: { locale: Locale; copy: Content }) {
	const links = [
		{ href: path(locale, "collection"), label: copy.footer.collection },
		{ href: path(locale, "commissions"), label: copy.footer.commissions },
		{ href: path(locale, "making"), label: copy.footer.making },
		{ href: path(locale, "story"), label: copy.footer.story },
		{ href: path(locale, "contact"), label: copy.footer.contact },
		{ href: path(locale, "policies"), label: copy.footer.policies },
	];

	return (
		<footer className="bg-cream text-ink">
			<div className="measure">
				<Stitch />
			</div>

			<div className="measure py-12 md:py-16">
				{/* The closing mark. At rest. */}
				<p className="font-script text-4xl leading-none md:text-5xl">{copy.footer.wordmark}</p>

				<nav className="mt-8">
					<ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
						{links.map((link) => (
							<li key={link.href}>
								<Link href={link.href} className="stitch-link">
									{link.label}
								</Link>
							</li>
						))}
					</ul>
				</nav>

				{/*
				 * Named, not linked. The social handles and the domain are one
				 * unanswered founder question (foundation §13, item 8), so the bracket
				 * stays visible rather than an invented URL shipping quietly.
				 */}
				<p className="mt-6 flex flex-wrap gap-x-6 gap-y-1 text-sm text-(--ink-quiet)">
					<span>
						{copy.footer.instagram} {copy.handles[0]}
					</span>
					<span>
						{copy.footer.tiktok} {copy.handles[1]}
					</span>
				</p>

				<p className="mt-10 max-w-prose text-sm leading-relaxed text-(--ink-quiet)">
					{/* Nguni, and named as Nguni wherever it is explained *(R14)*. */}
					<em className="serif-italic text-base">{copy.footer.maxim}</em>{" "}
					{copy.footer.maximGloss}
					<br />
					{copy.footer.place} {copy.footer.rights}
				</p>
			</div>
		</footer>
	);
}
