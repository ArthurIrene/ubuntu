import Link from "next/link";

import type { Content } from "@/content/en";
import type { Locale } from "@/lib/locale";
import { path } from "@/lib/routes";

/**
 * The footer, which is where **Policies and Talk to us** live *(R10)*.
 *
 * The philosophy line sits at the bottom of every page so that it underwrites
 * the whole site without being repeated in body copy. In Phase 6 the
 * handwritten script gets its one non-logo appearance here as the closing mark —
 * the site opens with the signature writing itself and closes with it at rest.
 *
 * **WhatsApp is never in the global footer** — it appears on `/contact` and on
 * order pages only.
 */
export default function SiteFooter({ locale, copy }: { locale: Locale; copy: Content }) {
	return (
		<footer>
			<p>{copy.footer.wordmark}</p>

			<nav>
				<ul>
					<li>
						<Link href={path(locale, "collection")}>{copy.footer.collection}</Link>
					</li>
					<li>
						<Link href={path(locale, "commissions")}>{copy.footer.commissions}</Link>
					</li>
					<li>
						<Link href={path(locale, "making")}>{copy.footer.making}</Link>
					</li>
					<li>
						<Link href={path(locale, "story")}>{copy.footer.story}</Link>
					</li>
					<li>
						<Link href={path(locale, "contact")}>{copy.footer.contact}</Link>
					</li>
					<li>
						<Link href={path(locale, "policies")}>{copy.footer.policies}</Link>
					</li>
				</ul>
			</nav>

			{/*
			 * Named, not linked. The social handles and the domain are one
			 * unanswered founder question (foundation §13, item 8), so the bracket
			 * stays visible rather than an invented URL shipping quietly.
			 */}
			<p>
				<span>
					{copy.footer.instagram} {copy.handles[0]}
				</span>{" "}
				<span>
					{copy.footer.tiktok} {copy.handles[1]}
				</span>
			</p>

			<p>
				<em>{copy.footer.maxim}</em> — {copy.footer.maximGloss} {copy.footer.place}{" "}
				{copy.footer.rights}
			</p>
		</footer>
	);
}
