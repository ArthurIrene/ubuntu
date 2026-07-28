// The nine order emails, the token re-send, and their variants. **English is
// canonical** — every string here is the source, and `rw.ts` is a translation
// of it *(R14)*.
//
// **These are code, not dashboard fields** *(R9d)*. A body edited in the
// dashboard has no key and no translation, so it silently becomes English-only
// and the flip bar cannot count what it does not know exists. Every wording
// change is a deploy, which is correct by `CLAUDE.md`'s own test: email wording
// is brand voice, and brand voice is design.
//
// What he writes himself is the **personal note** — optional, appended above
// the signature, in whatever language he is writing — on four of these only:
// Confirmed, Declined, design shared, On its way.
//
// ## `[X]`
//
// A bracket is an unanswered founder question and **must stay visible**. The
// helpers that fill these render the bracket rather than a number whenever the
// setting behind it is null. Never invent one.

/**
 * Every message the automated rail can send.
 *
 * Nine emails *(R11)*, plus the token re-send, plus the variants that R11's
 * own line asks for: *payment received fires up to three times, saying
 * something different at each gate*, and Confirmed says a different thing on a
 * commission because there is no total yet to confirm *(R6)*.
 */
export type EmailKey =
	| "order_created"
	| "confirmed"
	| "confirmed_commission"
	| "declined"
	| "design_shared"
	| "design_agreed"
	| "payment_received"
	| "payment_received_design_fee"
	| "payment_received_cutting"
	| "payment_received_balance"
	| "in_the_making"
	| "on_its_way"
	| "delivered"
	| "token_resend";

/**
 * One message, before its placeholders are filled.
 *
 * `{name}`, `{piece}`, `{amount}`, `{days}` and `{link}` are substituted by
 * `fill()` in `order.ts`. Kept as text with braces rather than as functions so
 * that a translator is handed sentences, not code.
 */
export interface EmailStrings {
	subject: string;
	paragraphs: string[];
	/** The label on the link to the order page, where there is one. */
	action?: string;
	/** Whether this is one of the four that carry his personal note *(R9d)*. */
	note?: true;
}

/** The one line under every message. */
export const SIGNATURE = "Ubuntu — hand-stitched in Kigali.";

/** What the link to the order page is called. Same words as the contact page. */
const OPEN = "Open your order";

export const en: Record<EmailKey, EmailStrings> = {
	/** Carries the token. The first and most important of the nine. */
	order_created: {
		subject: "Your request is with him",
		paragraphs: [
			"{name},",
			"Your request is with him. He reads each one himself and will confirm your piece and final price within {days} days. Nothing is owed until he does.",
			"Your order has its own page. His messages, your price, the photos as it is made — all of it lives there, and this link is how you reach it. Keep the email; we send it again whenever anything changes.",
		],
		action: OPEN,
	},

	confirmed: {
		subject: "He would like to make this",
		paragraphs: [
			"{name},",
			"He has read your request and he would like to make it. Your piece is {piece}, and the price is {amount}.",
			"Payment starts the making. Everything — the breakdown, how to pay, and where your piece stands — is on your order page.",
		],
		action: OPEN,
		note: true,
	},

	/**
	 * A commission has no total until the design exists, so the first number is
	 * the design fee and never a starting-from price *(R6)*.
	 */
	confirmed_commission: {
		subject: "He would like to make this",
		paragraphs: [
			"{name},",
			"He would like to make this. Before he draws, there is a fee of {amount} — it buys his drafting hours, and it comes off the price of your piece. Nothing else is owed until you have seen the design and said yes.",
		],
		action: OPEN,
		note: true,
	},

	/** Worded as a maker's choice, not a rejection. */
	declined: {
		subject: "About your request",
		paragraphs: [
			"{name},",
			"He has read your request, and this one is not a piece he can make. He has written to you himself about why.",
		],
		note: true,
	},

	design_shared: {
		subject: "Your scene",
		paragraphs: [
			"{name},",
			"He has drawn your scene. It is on your order page — take your time with it, and tell him what you think.",
			"Nothing more is owed until you have seen it and said yes.",
		],
		action: OPEN,
		note: true,
	},

	design_agreed: {
		subject: "The scene is yours",
		paragraphs: [
			"{name},",
			"The scene is yours. The next payment buys the cloth and starts the cutting; the balance falls due when the piece is finished, before it ships.",
		],
		action: OPEN,
	},

	/** A collection order has one gate, so this is the only one it ever sends. */
	payment_received: {
		subject: "Your payment has landed",
		paragraphs: [
			"{name},",
			"Your payment of {amount} has landed. Your payment buys the fabric and his hours. The needle starts when it arrives.",
			// `ubuntu-copy.md` §8 writes the queue line with a number — *he'll
			// start it in about [X] days* — and that is the **order page's**
			// sentence, where the offset is live beside it. An email is written
			// once and read later, and the one figure available here is the global
			// queue offset, which is zero today: *about 0 days* is worse than no
			// number, and a visible bracket is for a figure nobody has answered
			// rather than one that is genuinely nought. So this says the true thing
			// without one.
			"Your piece is in the queue. He will start it when the pieces before it are finished, and you will see it when he does.",
		],
		action: OPEN,
	},

	/** The design fee. This is the payment *In design* is derived from *(R6)*. */
	payment_received_design_fee: {
		subject: "Your payment has landed",
		paragraphs: [
			"{name},",
			"Your design fee of {amount} has landed, and it comes off the price of your piece.",
			"He is drawing. He will bring you the scene when it is ready — usually within {days} days — and nothing more is owed until you have seen it and said yes.",
		],
		action: OPEN,
	},

	payment_received_cutting: {
		subject: "Your payment has landed",
		paragraphs: [
			"{name},",
			"Your payment of {amount} has landed. It buys the cloth and starts the cutting.",
			"The balance falls due when the piece is finished, before it ships.",
		],
		action: OPEN,
	},

	payment_received_balance: {
		subject: "Your payment has landed",
		paragraphs: [
			"{name},",
			"Your balance of {amount} has landed, and your piece is paid in full.",
			"It goes to the post as soon as it is wrapped. We will write again when it is on its way.",
		],
		action: OPEN,
	},

	in_the_making: {
		subject: "He has started your piece",
		paragraphs: [
			"{name},",
			"The needle is in the cloth. He has started {piece}.",
			"Photographs arrive on your order page as the scene takes shape.",
		],
		action: OPEN,
	},

	on_its_way: {
		subject: "Your piece is on its way",
		paragraphs: [
			"{name},",
			"{piece} is finished and it is on its way to you.",
			"When it arrives, its story arrives with it.",
		],
		action: OPEN,
		note: true,
	},

	delivered: {
		subject: "Welcome to Abantu",
		paragraphs: [
			"{name},",
			"Your piece has reached you. Welcome to Abantu.",
			"If the fit needs adjusting, tell us — the details are on your order page, and it stays there for as long as the piece does.",
		],
		action: OPEN,
	},

	/**
	 * A link and one line *(R11)*. Sent by hand from the dashboard when someone
	 * has lost theirs — and the token in it is **the same one**, because a hash
	 * cannot be reversed into a link and *no expiry, ever* means the old copy
	 * has to keep working *(R5, R12d)*.
	 */
	token_resend: {
		subject: "Your order page",
		paragraphs: [
			"{name},",
			"Here is the link to your order page again. It does not expire.",
		],
		action: OPEN,
	},
};

/** The shape every locale resolves to. */
export type EmailContent = typeof en;

/**
 * A locale overlay names every key. A value is the translation, or null where
 * it has not been written — so adding an email to `en` forces a matching entry
 * in each translation, and a new string can never be silently left
 * untranslated. **The absent Kinyarwanda values are the unbuilt part, which is
 * exactly what a reservation is supposed to look like** *(R16)*.
 */
export type EmailTranslation = {
	[K in EmailKey]: {
		subject: string | null;
		paragraphs: string[] | null;
		action?: string | null;
	};
};
