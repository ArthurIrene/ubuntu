"use server";

import { redirect } from "next/navigation";

import { toLocale, type Locale } from "@/lib/locale";
import {
	createCollectionOrder,
	createCommissionOrder,
	type OrderError,
} from "@/lib/order-create";
import { path, piecePath } from "@/lib/routes";

// The public order forms, and the only two places on the public site that write.
//
// **Thin on purpose.** These read a `FormData`, hand it to `src/lib/order-create.ts`
// and route the answer. Every rule about what an order *is* lives there, so the
// two forms cannot drift into creating two different things.
//
// ## What happens without JavaScript
//
// Everything. A plain `<form action={…}>` posts and the action redirects — to
// `/o/<token>` when it worked, and back to the form with `?e=<field>` when it
// did not. That is deliberate rather than incidental: **the form must complete
// with no JavaScript, no motion and a screen reader** *(R7)*, and returning
// state instead would mean `useActionState`, which means `'use client'`, which
// means the order form stops working for the customer on the worst connection.
//
// *The cost, named: a refused submission loses what they typed.* That is a real
// cost and it is Phase 5's to pay, with the form copy — it needs a rendered
// design to solve properly, and solving it here with client state would trade a
// working no-JS form for a prettier failure.

/** What a form said, trimmed. Never trusted to name a row. */
const text = (form: FormData, field: string): string => String(form.get(field) ?? "").trim();

/**
 * The one thing on these forms that is not for the customer.
 *
 * An unauthenticated write that also sends mail is the most attackable surface
 * on this site, and there is no budget for a captcha — `CLAUDE.md` forbids
 * adding a paid service, and every free one is a third party reading the form
 * where someone types their phone number. A hidden field costs nothing, adds no
 * dependency and stops the undirected scripted submission, which is the only
 * kind a four-piece catalogue attracts.
 *
 * **It is not a security control and is not treated as one.** It is a doormat.
 * Anything aimed at this site specifically walks straight over it, which is why
 * the write path validates everything else on its own.
 */
const trapped = (form: FormData): boolean => text(form, "hp").length > 0;

/** Which locale the form was read in. Hidden on the form, never guessed. */
const localeOf = (form: FormData): Locale => toLocale(text(form, "locale"));

const channelOf = (form: FormData): "email" | "whatsapp" =>
	text(form, "preferredChannel") === "whatsapp" ? "whatsapp" : "email";

/**
 * Back to the form, saying what was wrong.
 *
 * A key, not a message — the page turns it into a sentence in the locale it is
 * already rendering *(R14)*.
 */
function refuse(where: string, error: OrderError): never {
	redirect(`${where}?e=${error}`);
}

/**
 * *Ask for this piece.*
 *
 * The slug comes from the form because the form is on that piece's page; the
 * piece itself is resolved from it under the public predicate, so a hand-edited
 * value cannot reach a draft, a removed piece or a commission-kind one.
 */
export async function askForPiece(form: FormData): Promise<void> {
	const locale = localeOf(form);
	const slug = text(form, "slug");
	const back = piecePath(locale, slug);

	if (trapped(form)) refuse(back, "unknown");

	// The three option groups, each at most one answer. Absent means the piece
	// asks no question in that group — a piece with one cut asks nobody to
	// classify themselves.
	const options = (["colourway", "cut", "size"] as const)
		.map((group) => ({ group, key: text(form, `option_${group}`) }))
		.filter((option) => option.key.length > 0);

	/*
	 * The fit fork's answers *(R7)*.
	 *
	 * Every measurement the form could have asked for arrives under `m_<key>`;
	 * which ones were actually asked is decided by the garment type's own list,
	 * on the server, so a hand-added field for a measurement he never configured
	 * is read by nobody.
	 */
	const typed: Record<string, string> = {};
	for (const [field, value] of form.entries()) {
		if (field.startsWith("m_") && typeof value === "string") typed[field.slice(2)] = value;
	}

	const result = await createCollectionOrder({
		slug,
		options,
		priority: form.get("priority") === "on",
		fit: {
			path: text(form, "fitPath") === "size" ? "size" : "measurements",
			who: text(form, "fitWho"),
			age: text(form, "fitAge"),
			size: text(form, "fitSize"),
			typed,
		},
		name: text(form, "name"),
		email: text(form, "email"),
		phone: text(form, "phone"),
		locale,
		preferredChannel: channelOf(form),
	});

	if (!result.ok) {
		/*
		 * **The keys travel; the numbers never do.** A refused fit names the
		 * fields it is about so the form can put the sentence beside the right
		 * input — and a measurement in a query string would land in server logs,
		 * browser history and every Referer header the page emits, which is the
		 * one thing R7 and R11 forbid absolutely.
		 */
		const fields = result.fields?.length ? `&f=${result.fields.join(",")}` : "";
		redirect(`${back}?e=${result.error}${fields}`);
	}

	// **The token is the credential** *(R5)*. It goes into the address bar of the
	// person who just typed their name and into the email that has just been
	// constructed for them, and nowhere else — never a log, never an error.
	redirect(`/o/${result.token}`);
}

/**
 * *Send it to him.*
 *
 * A commission asks for a story and not a size. Fit arrives on the order page
 * when the design is agreed *(R7)* — there is nothing to cut yet, and asking
 * sleeve length beside someone's grandmother's story would break the spell.
 */
export async function sendCommission(form: FormData): Promise<void> {
	const locale = localeOf(form);
	const back = path(locale, "commissions");

	if (trapped(form)) refuse(back, "unknown");

	const result = await createCommissionOrder({
		scene: text(form, "scene"),
		garment: text(form, "garment"),
		anythingElse: text(form, "anythingElse"),
		// The labels the form put beside those answers, in the language they were
		// reading. Their words are kept as one passage and shown back to them, so
		// the labels travel with them rather than being reconstructed later in
		// whichever language happens to be rendering.
		labels: {
			scene: text(form, "labelScene"),
			garment: text(form, "labelGarment"),
			anythingElse: text(form, "labelAnythingElse"),
		},
		name: text(form, "name"),
		email: text(form, "email"),
		phone: text(form, "phone"),
		locale,
		preferredChannel: channelOf(form),
	});

	if (!result.ok) refuse(back, result.error);

	redirect(`/o/${result.token}`);
}
