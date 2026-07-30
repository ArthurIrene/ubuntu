import type { Metadata } from "next";
import Link from "next/link";

import { pageContext } from "@/lib/page";
import { path } from "@/lib/routes";

/**
 * `/contact` — *Talk to us*.
 *
 * **Its job is to route, not to be reachable** *(R10, foundation §11I)*. It sits in
 * the footer beside Policies and is deliberately not in the nav: a contact link in
 * the nav is exactly what quietly competes with the order form.
 *
 * Specified in two documents with a URL in neither until the pre-build review,
 * which is why R10 wrote it down and gave it this phase.
 *
 * **WhatsApp appears here and on order pages, never in the global footer.**
 */
export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { copy } = await pageContext(params);
	return { title: copy.contact.title };
}

export default async function Contact({ params }: { params: Promise<{ locale: string }> }) {
	const { locale, copy } = await pageContext(params);

	return (
		<main>
			<h1>{copy.contact.heading}</h1>
			<p>{copy.contact.opening}</p>

			<section>
				<h2>{copy.contact.orderHeading}</h2>
				<p>{copy.contact.order}</p>
				{/*
				 * **Not a link, and it will not become one.** An order is reached only by
				 * the 128-bit token in the path that was mailed to the person who placed
				 * it — there is no lookup, no sign-in, and no page here that could find
				 * an order for a stranger. The absence is the control. The next line is
				 * what someone who has lost the link actually does.
				 */}
				<p>{copy.contact.orderLink}</p>
				<p>{copy.contact.orderLost}</p>
			</section>

			<section>
				<h2>{copy.contact.commissionHeading}</h2>
				<p>
					<Link href={path(locale, "commissions")}>{copy.contact.commission}</Link>
				</p>
			</section>

			{/*
			 * Where the message form mounts. Inert, and not a `<form>`: with no action
			 * it would submit itself back to this page on Enter.
			 */}
			<section>
				<h2>{copy.contact.elseHeading}</h2>
				<p>{copy.contact.else}</p>

				<p>
					<label htmlFor="name">{copy.contact.name}</label>
					<input id="name" type="text" disabled />
				</p>
				<p>
					<label htmlFor="reply">{copy.contact.reply}</label>
					<input id="reply" type="text" disabled />
				</p>
				<p>
					<label htmlFor="message">{copy.contact.message}</label>
					<textarea id="message" disabled />
				</p>
				<p>
					<button type="button" disabled>
						{copy.contact.button}
					</button>
				</p>
			</section>

			<section>
				<h2>{copy.contact.whatsappHeading}</h2>
				{/* His number is founder homework; the bracket stays visible rather than
				    a wa.me link to a number nobody has given us. */}
				<p>{copy.contact.whatsapp}</p>
			</section>
		</main>
	);
}
