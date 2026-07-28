// Composing one order email, and the WhatsApp draft that says the same thing.
//
// **The email always fires, whatever channel the customer chose** *(R11)*. It
// is the permanent address of the order token — R5 refused expiry because a
// dead link is the site forgetting someone, and a chat thread is not durable
// storage. Choosing WhatsApp makes the hand-sent draft a *required* row in the
// Today queue; it never decides whether the email goes.
//
// The draft is built here, beside the email it mirrors, so the two cannot
// drift: same wording, same token link, the customer's locale, written by us
// and sent by his thumb.
//
// **Never a measurement, on either channel** *(R7, R11)*. Nothing in this
// module can reach one: it is handed a name, a piece, an amount and a link.

import type { EmailMessage } from "@/lib/email";
import type { Locale } from "@/lib/locale";

import { en, SIGNATURE, type EmailKey, type EmailStrings } from "./en";
import { rw } from "./rw";
import { shell } from "./shell";

export type { EmailKey };

/**
 * Everything a template may substitute.
 *
 * A closed set, and short. Anything not on this list is not something an email
 * is allowed to say — which is the mechanism that keeps a measurement out of
 * one rather than a rule someone has to remember.
 */
export interface OrderEmailVars {
	/** What he calls them. */
	name: string;
	/** The piece's name, or a stand-in while a commission has no piece yet. */
	piece?: string;
	/** Minor units, with the currency beside it. */
	amount?: { value: number; currency: string } | null;
	/** A number of days, or null — in which case the bracket renders. */
	days?: number | null;
	/** The order page. **Never logged, never rendered in the dashboard.** */
	link: string;
	/** His own words, on the four emails that carry them. */
	note?: string | null;
}

const OVERLAYS: Record<Locale, Partial<Record<EmailKey, unknown>> | null> = {
	en: null,
	rw,
};

/**
 * The strings for one email in one locale: the translated value where he has
 * written one, the English everywhere else.
 *
 * **A missing Kinyarwanda string falls back silently** *(R14)*. Nothing is ever
 * blocked on a translation, and nothing renders half-translated in a way a
 * reader would notice as broken.
 */
function strings(key: EmailKey, locale: Locale): EmailStrings {
	const base = en[key];
	const overlay = OVERLAYS[locale]?.[key] as
		| { subject: string | null; paragraphs: string[] | null; action?: string | null }
		| undefined;
	if (!overlay) return base;

	return {
		subject: overlay.subject ?? base.subject,
		paragraphs: overlay.paragraphs ?? base.paragraphs,
		action: overlay.action ?? base.action,
		note: base.note,
	};
}

/**
 * Money, as a reader sees it.
 *
 * Stored as whole minor units with an explicit currency *(R3)*; for RWF the
 * minor unit is the franc itself, because there are no centimes in circulation.
 */
export function formatMoney(amount: { value: number; currency: string }): string {
	try {
		return new Intl.NumberFormat("en-RW", {
			style: "currency",
			currency: amount.currency,
			maximumFractionDigits: 0,
		}).format(amount.value);
	} catch {
		// An unknown currency code should not be able to stop an order email.
		return `${amount.value.toLocaleString("en")} ${amount.currency}`;
	}
}

/**
 * A number of days, or the bracket.
 *
 * **`[X]` is an unanswered founder question and must stay visible** — the
 * reply-time setting is null until he answers it, and the rule is *never invent
 * the number*. A bracket reaching a customer is a bug he can see; an invented
 * *3 days* is a promise nobody made.
 */
export function formatDays(days: number | null | undefined): string {
	return typeof days === "number" ? String(days) : "[X]";
}

function fill(template: string, vars: OrderEmailVars): string {
	return template
		.replace(/\{name\}/g, vars.name)
		.replace(/\{piece\}/g, vars.piece ?? "your piece")
		.replace(/\{amount\}/g, vars.amount ? formatMoney(vars.amount) : "[X]")
		.replace(/\{days\}/g, formatDays(vars.days));
}

/**
 * One finished email, addressed and worded, ready for the adapter.
 *
 * The personal note is appended only where the template says it carries one —
 * Confirmed, Declined, design shared, On its way *(R9d)* — and passing one to
 * any other email is silently ignored rather than quietly changing an email
 * that was never meant to have his voice in it.
 */
export function orderEmail(
	key: EmailKey,
	locale: Locale,
	to: string,
	vars: OrderEmailVars,
): EmailMessage {
	const copy = strings(key, locale);

	const body = shell({
		preview: fill(copy.subject, vars),
		paragraphs: copy.paragraphs.map((line) => fill(line, vars)),
		action: copy.action ? { label: copy.action, url: vars.link } : undefined,
		note: copy.note ? vars.note : null,
		signature: SIGNATURE,
	});

	return { to, subject: fill(copy.subject, vars), html: body.html, text: body.text };
}

/**
 * The same message, as a `wa.me` link he taps to send *(R11)*.
 *
 * **Never the Business API and never a scheduled send.** Meta bills per
 * business-initiated message outside an open 24-hour window, which is exactly
 * what a status update is. His own thumb is free, and `wa.me` needs no API, no
 * billing and no approval — the distinction was always the robot, not the
 * channel.
 *
 * The plain-text half of the email is what travels, so the words a customer
 * reads on WhatsApp and the words they read in their inbox are the same words.
 */
export function whatsappDraft(
	key: EmailKey,
	locale: Locale,
	phone: string,
	vars: OrderEmailVars,
): string {
	const copy = strings(key, locale);

	const message = [
		...copy.paragraphs.map((line) => fill(line, vars)),
		copy.note && vars.note?.trim() ? vars.note.trim() : null,
		vars.link,
	]
		.filter((part): part is string => Boolean(part))
		.join("\n\n");

	// wa.me wants digits only — no plus, no spaces, no dashes.
	return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}
