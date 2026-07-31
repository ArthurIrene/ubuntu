// What an order *is*, derived — and what the next move on it is, and whose.
//
// **There is no status column in the schema** *(R4)*. An order is an
// append-only event log plus a payments table, and everything below is a pure
// function over those two. That is what gives the customer page, the audit
// trail, and the guarantee that nothing is silently overwritten.
//
// It is pure on purpose: the Today queue's membership rule is the single most
// consequential piece of logic in the dashboard, and it should be provable at a
// desk rather than by clicking through a live order. No imports from the
// database, no dates read off the clock except the one passed in.

import type { EmailKey } from "@/emails/en";

// ---------------------------------------------------------------------------
// The facts a decision is made from
// ---------------------------------------------------------------------------

export type EventType =
	| "requested"
	| "confirmed"
	| "declined"
	| "design_shared"
	| "design_agreed"
	| "fit_recorded"
	| "fit_checked"
	| "price_adjusted"
	| "making_started"
	| "making_complete"
	| "shipped"
	| "delivered"
	| "lapsed"
	| "cancelled"
	| "token_rotated"
	| "message_sent"
	| "message_failed";

export type PaymentGate = "design_fee" | "cutting" | "balance";

export interface EventFact {
	type: EventType;
	at: Date;
	note: string | null;
}

export interface PaymentFact {
	id: string;
	amount: number;
	type: "payment" | "refund" | "correction";
	gate: PaymentGate | null;
	/** The customer said they paid and he has not confirmed it yet *(R4)*. */
	reported: boolean;
	confirmedAt: Date | null;
	createdAt: Date;
}

export interface ScheduleFact {
	gate: PaymentGate | null;
	amount: number | null;
	position: number;
}

/** Everything the rules below read. Nothing else about an order matters here. */
export interface OrderFacts {
	kind: "collection" | "commission";
	preferredChannel: "email" | "whatsapp";
	events: EventFact[];
	payments: PaymentFact[];
	schedule: ScheduleFact[];
	/**
	 * Whether a fit record exists and whether it has been checked *(R9c)*.
	 *
	 * Two separate facts because they gate different things: no record at all
	 * means there is nothing to check yet, and an unchecked record is what
	 * stands between an order and *In the making*.
	 */
	hasFitRecord: boolean;
	fitChecked: boolean;
}

// ---------------------------------------------------------------------------
// Status, derived
// ---------------------------------------------------------------------------

/**
 * The customer-facing words, exactly as `ubuntu-copy.md` fixes them.
 *
 * `in_design` is commissions only and is **derived from the design fee
 * landing** *(R6)* — without it a commission reads *Confirmed* for three weeks
 * while he is actively drawing, which looks stalled.
 */
export type Status =
	| "requested"
	| "confirmed"
	| "in_design"
	| "paid"
	| "in_the_making"
	| "on_its_way"
	| "delivered"
	| "declined"
	| "lapsed"
	| "cancelled";

/** The label a customer reads. Fixed strings — do not improve them. */
export const STATUS_LABEL: Record<Status, string> = {
	requested: "Requested",
	confirmed: "Confirmed",
	in_design: "In design",
	paid: "Paid",
	in_the_making: "In the making",
	on_its_way: "On its way",
	delivered: "Delivered",
	declined: "Declined",
	lapsed: "Lapsed",
	cancelled: "Cancelled",
};

export function hasEvent(facts: OrderFacts, type: EventType): boolean {
	return facts.events.some((event) => event.type === type);
}

/**
 * Money actually received, in minor units.
 *
 * **Confirmed rows only.** A reported payment is a customer's claim awaiting
 * his eye, never an order state *(R4)* — money that has not been confirmed has
 * not been received. Refunds subtract and corrections adjust, which is what
 * R16's `type` enum bought: a refund is never a negative payment somebody has
 * to infer.
 */
export function netPaid(facts: OrderFacts, gate?: PaymentGate | null): number {
	return facts.payments
		.filter((payment) => payment.confirmedAt !== null)
		.filter((payment) => gate === undefined || payment.gate === gate)
		.reduce(
			(total, payment) => total + (payment.type === "refund" ? -payment.amount : payment.amount),
			0,
		);
}

/** The gates, in the order they fall due. One entry on a collection order *(R6)*. */
export function gates(facts: OrderFacts): ScheduleFact[] {
	return [...facts.schedule].sort((a, b) => a.position - b.position);
}

/** The first gate still short of its figure, or null when nothing is owed. */
export function openGate(facts: OrderFacts): ScheduleFact | null {
	for (const entry of gates(facts)) {
		// A gate with no figure yet is not open — the balance on a commission has
		// no amount until the design is agreed, and asking for an unknown number
		// is not a move he can make.
		if (entry.amount === null) continue;
		if (netPaid(facts, entry.gate) < entry.amount) return entry;
	}
	return null;
}

/**
 * True while any gate that falls due by `by` is still waiting on a figure.
 *
 * **An order with an unpriced gate is not paid, however much has landed.** A
 * commission's cutting payment and balance have no amount until the design is
 * agreed *(R6)*, and treating "nothing is currently owed" as "paid in full"
 * would put an order into the making before there was a price for the piece.
 */
export function hasUnpricedGate(facts: OrderFacts, by: Milestone = "shipping"): boolean {
	return dueBy(facts, by).some((entry) => entry.amount === null);
}

/**
 * The two moments money has to have arrived by.
 *
 * **The balance falls due on completion, before shipping** *(R6)* — so it is
 * outstanding for the whole time a commission is being made, and R4 is explicit
 * that *awaiting balance* needs no state of its own because paid-ness is a
 * separate dimension from the journey.
 *
 * This is what stops the balance blocking the needle and stops it being
 * forgotten at the post office.
 */
export type Milestone = "making" | "shipping";

/** The gates that must be settled before a milestone. */
export function dueBy(facts: OrderFacts, milestone: Milestone): ScheduleFact[] {
	return gates(facts).filter((entry) => milestone === "shipping" || entry.gate !== "balance");
}

/**
 * Whether everything owed by a milestone has arrived.
 *
 * A collection order has one unnamed gate, so both milestones ask the same
 * question of it — which is R6's *a collection order is a commission with one
 * gate*, falling out of the model rather than being special-cased.
 */
export function settledBy(facts: OrderFacts, milestone: Milestone): boolean {
	const due = dueBy(facts, milestone);
	if (due.length === 0) return false;
	if (due.some((entry) => entry.amount === null)) return false;
	return due.every((entry) => netPaid(facts, entry.gate) >= entry.amount!);
}

/**
 * Where the order stands, derived from the log and the payments table.
 *
 * Off-path endings win: an order that was declined is declined whatever else
 * once happened to it. **Lapsed is operationally essential** — without it every
 * stranger who requests and vanishes sits in Confirmed forever *(R4)*.
 */
export function status(facts: OrderFacts): Status {
	if (hasEvent(facts, "cancelled")) return "cancelled";
	if (hasEvent(facts, "declined")) return "declined";
	if (hasEvent(facts, "lapsed")) return "lapsed";

	if (hasEvent(facts, "delivered")) return "delivered";
	if (hasEvent(facts, "shipped")) return "on_its_way";
	if (hasEvent(facts, "making_started")) return "in_the_making";

	// **Paid and In the making stay separate** *(R4)*. Paid means in the queue;
	// In the making means he has started. That is the honest version of
	// priority-as-position, and collapsing them would sell speed.
	// **Paid means everything owed *so far*.** On a commission the balance falls
	// due on completion, before shipping, so it is outstanding for the whole time
	// the piece is being made — R4 is explicit that *awaiting balance* needs no
	// state of its own, because paid-ness is a separate dimension from the
	// journey. Requiring it here would mean no commission ever reached the
	// needle.
	//
	// **A commission cannot reach Paid before the design is agreed** *(R6)*. The
	// piece is minted at that moment, which is when making days become knowable
	// and it enters the queue — so however much has landed, an unagreed design is
	// an order with nothing yet to make.
	const designSettled = facts.kind === "collection" || hasEvent(facts, "design_agreed");
	if (hasEvent(facts, "confirmed") && designSettled && settledBy(facts, "making")) return "paid";

	if (facts.kind === "commission" && netPaid(facts, "design_fee") > 0) return "in_design";
	if (hasEvent(facts, "confirmed")) return "confirmed";
	return "requested";
}

/** True once the order has reached one of its three off-path endings. */
export function isClosed(facts: OrderFacts): boolean {
	const now = status(facts);
	return now === "declined" || now === "lapsed" || now === "cancelled";
}

// ---------------------------------------------------------------------------
// The Today queue — gate-based, never time-based
// ---------------------------------------------------------------------------

/**
 * Every reason an order can be waiting on **him**.
 *
 * **Membership is gate-based** *(R9a)*: a row appears when the next move is his
 * and leaves the moment he makes it. There is no threshold to tune, so the
 * queue cannot nag and cannot go quiet — time-based membership would need six
 * numbers guessed before a single real order exists, and guessing them wrong is
 * what teaches him to stop looking.
 */
export type ActionKey =
	| "confirm_price"
	| "confirm_payment"
	| "share_design"
	| "start_making"
	| "mark_complete"
	| "mark_shipped"
	| "mark_delivered"
	| "send_whatsapp"
	| "resend_failed";

/**
 * Whether the row completes where it stands or opens the order.
 *
 * **Facts complete inline** — payment landed, package posted. One tap, the row
 * goes, the email fires; he is recording something that already happened.
 *
 * **Judgements open the order** — confirming a price, sharing a design. Each
 * snapshots a breakdown and sends a number that cannot be taken back, and **a
 * one-tap approve on a price is exactly how a wrong price gets sent** *(R9a)*.
 */
export type ActionMode = "fact" | "judgement";

export interface QueueAction {
	key: ActionKey;
	mode: ActionMode;
	/** The payment this row is about, on `confirm_payment`. */
	paymentId?: string;
	/** The message this row is about, on `send_whatsapp` and `resend_failed`. */
	emailKey?: EmailKey;
}

/** The heading each group sits under, with its count beside it *(R9a)*. */
export const ACTION_HEADING: Record<ActionKey, string> = {
	confirm_price: "Confirm a price",
	confirm_payment: "Record a payment",
	share_design: "Share a design",
	start_making: "Start the making",
	mark_complete: "Mark it finished",
	mark_shipped: "Post it",
	mark_delivered: "Mark it delivered",
	send_whatsapp: "Send it on WhatsApp",
	resend_failed: "Could not reach them",
};

/** The order the headings appear in — his day, roughly, from decisions to errands. */
export const ACTION_ORDER: ActionKey[] = [
	"resend_failed",
	"confirm_price",
	"confirm_payment",
	"share_design",
	"start_making",
	"mark_complete",
	"mark_shipped",
	"mark_delivered",
	"send_whatsapp",
];

/**
 * A `message_sent` / `message_failed` note reads `channel:key` — `email:confirmed`.
 *
 * The log's note is deliberately one text column and not a JSON blob *(R4)*, so
 * this is the whole encoding. **Never a token, never a measurement.**
 */
export function messageNote(channel: "email" | "whatsapp", key: EmailKey): string {
	return `${channel}:${key}`;
}

function sentOn(facts: OrderFacts, channel: "email" | "whatsapp"): Set<string> {
	const sent = new Set<string>();
	for (const event of facts.events) {
		if (event.type !== "message_sent" || !event.note) continue;
		const [where, key] = event.note.split(":");
		if (where === channel && key) sent.add(key);
	}
	return sent;
}

/**
 * The last thing that happened to each message on a channel — sent, or failed.
 *
 * A message can be sent, bounce, be resent by hand and bounce again, and only
 * the newest outcome decides whether he still has something to do about it. Ties
 * on the timestamp fall to the later event in the log, because `at` is recorded
 * to the second and two events inside one second are still ordered by the order
 * they were appended in.
 */
function latestPerKey(
	facts: OrderFacts,
	channel: "email" | "whatsapp",
): Map<string, "message_sent" | "message_failed"> {
	const latest = new Map<string, { at: Date; type: "message_sent" | "message_failed" }>();

	for (const event of facts.events) {
		if (event.type !== "message_sent" && event.type !== "message_failed") continue;
		if (!event.note) continue;

		const [where, key] = event.note.split(":");
		if (where !== channel || !key) continue;

		const held = latest.get(key);
		if (!held || event.at >= held.at) latest.set(key, { at: event.at, type: event.type });
	}

	return new Map([...latest].map(([key, held]) => [key, held.type]));
}

/**
 * Everything waiting on him for this one order. **Complete, never truncated.**
 *
 * An order can legitimately produce more than one row — a payment to record and
 * a WhatsApp message still to send are two separate moves — and both appear,
 * because a queue that hides its tail is worse than no queue.
 */
export function queueActions(facts: OrderFacts): QueueAction[] {
	const actions: QueueAction[] = [];

	// A failed send outranks everything: the customer never saw the message, and
	// without this row a bounced Confirmed reads as a stranger who changed their
	// mind *(R11)*.
	//
	// **The question is what happened to this message *last*, not whether it was
	// ever sent.** That distinction is the whole rule, and getting it wrong is
	// silent: a bounce always *follows* a successful hand-off, because a bounce
	// means the provider accepted the message and the recipient's server rejected
	// it afterwards. Asking "was this key ever sent?" is therefore always
	// answered yes at the moment a bounce lands, and the row that should appear
	// never does — which is exactly the silence R11 built the webhook to end.
	const sentByEmail = sentOn(facts, "email");
	for (const [key, outcome] of latestPerKey(facts, "email")) {
		if (outcome === "message_failed") {
			actions.push({ key: "resend_failed", mode: "fact", emailKey: key as EmailKey });
		}
	}

	if (isClosed(facts)) return actions;

	// A price is a judgement, and it is the one that cannot be taken back.
	if (!hasEvent(facts, "confirmed")) {
		actions.push({ key: "confirm_price", mode: "judgement" });
	}

	// A customer-reported payment is a row awaiting his eye. Recording it is a
	// fact — the money either arrived or it did not.
	for (const payment of facts.payments) {
		if (payment.reported && payment.confirmedAt === null) {
			actions.push({ key: "confirm_payment", mode: "fact", paymentId: payment.id });
		}
	}

	// The design: money gates on the agreement, so both moments are events *(R6)*.
	if (
		facts.kind === "commission" &&
		netPaid(facts, "design_fee") > 0 &&
		!hasEvent(facts, "design_shared")
	) {
		actions.push({ key: "share_design", mode: "judgement" });
	}

	const now = status(facts);

	// Paid, and not started. The fit check stands between the two *(R9c)*, which
	// is why this opens the order rather than completing inline.
	if (now === "paid" && !hasEvent(facts, "making_started")) {
		actions.push({ key: "start_making", mode: "judgement" });
	}

	// `making_complete` separates finished stitching from got-to-the-post-office
	// *(R6)* — the duration wanted when calculated timeframes arrive.
	if (now === "in_the_making" && !hasEvent(facts, "making_complete")) {
		actions.push({ key: "mark_complete", mode: "fact" });
	}

	// **The balance falls due before it ships** *(R6)*. Nothing stops him
	// finishing the piece; this is the one place the last gate is enforced, and
	// while it is open the order is waiting on them rather than on him.
	if (
		hasEvent(facts, "making_complete") &&
		!hasEvent(facts, "shipped") &&
		settledBy(facts, "shipping")
	) {
		actions.push({ key: "mark_shipped", mode: "fact" });
	}

	if (hasEvent(facts, "shipped") && !hasEvent(facts, "delivered")) {
		actions.push({ key: "mark_delivered", mode: "fact" });
	}

	// **Choosing WhatsApp makes the draft a required row** *(R11)*. It does not
	// clear until he has sent it. Every emailing row offers the draft anyway;
	// this is the one that will not go away on its own.
	if (facts.preferredChannel === "whatsapp") {
		const sentOnWhatsapp = sentOn(facts, "whatsapp");
		for (const key of sentByEmail) {
			if (!sentOnWhatsapp.has(key)) {
				actions.push({ key: "send_whatsapp", mode: "fact", emailKey: key as EmailKey });
			}
		}
	}

	return actions;
}

/**
 * True when the next move is **theirs**, not his.
 *
 * The gate-based rule cannot catch this by construction, so it is one line at
 * the foot of the queue — *3 waiting on customers* — and not mixed in among the
 * rows *(R9a)*. It is also what feeds R4's Lapsed.
 */
export function waitingOnCustomer(facts: OrderFacts): boolean {
	if (isClosed(facts)) return false;
	if (queueActions(facts).length > 0) return false;

	// Money owed at an open gate, or a design shared and not yet agreed.
	if (hasEvent(facts, "confirmed") && openGate(facts) !== null) return true;
	// Finished, and waiting on the balance before it can be posted.
	if (hasEvent(facts, "making_complete") && !settledBy(facts, "shipping")) return true;
	if (hasEvent(facts, "design_shared") && !hasEvent(facts, "design_agreed")) return true;
	return false;
}

/**
 * Whole days since the last thing that happened.
 *
 * **Information only** *(R9a)*. It never adds a row and never removes one — the
 * date was the part that had to be visible; the age is not the rule.
 */
export function daysWaiting(facts: OrderFacts, now: Date): number {
	const latest = facts.events.reduce(
		(newest, event) => (event.at > newest ? event.at : newest),
		new Date(0),
	);
	if (latest.getTime() === 0) return 0;
	return Math.max(0, Math.floor((now.getTime() - latest.getTime()) / 86_400_000));
}
