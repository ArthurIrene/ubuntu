// The payments adapter. This is the only module that may talk to a payment
// gateway — nothing else in the app reaches for a gateway SDK.
//
// It is not a wrapper around one. Payment state is our database state: the
// dashboard writes these rows today by hand, and when a gateway arrives its
// webhook writes the same rows. That is what makes the gateway a later
// addition rather than a rewrite — the order model and the customer's journey
// do not move when it lands.
//
// Interface only. No gateway is configured and the schema is pending, so every
// method throws.

/**
 * An amount of money, as an integer in the currency's smallest unit plus the
 * currency it is counted in.
 *
 * Never floating point. Money that has been through a `number` with a decimal
 * point is money that can be out by a franc, and a price the founder confirmed
 * must be the price the customer is charged.
 *
 * Minor units means the smallest unit the currency actually has. For RWF that
 * is the franc itself — there are no centimes in circulation — so `minorUnits`
 * is a whole number of francs at launch. The field is named for the general
 * rule rather than for RWF so that a second currency changes a value here and
 * nothing about the type.
 *
 * Readonly: an amount is a fact that was recorded, not a running total that
 * gets adjusted in place. Arithmetic returns a new `Money`.
 */
export interface Money {
	/** Integer. Never a decimal, never a float. */
	readonly minorUnits: number;
	/** ISO 4217, uppercase. `"RWF"` at launch. */
	readonly currency: string;
}

/**
 * What kind of money movement a row records.
 *
 * A refund is **its own typed row**, not a payment with a negative amount that
 * a reader has to infer. Inferring it means every query that sums money has to
 * know the convention, and the first one that forgets reports a refund as
 * income.
 *
 * A `correction` fixes a recording mistake — money that was entered wrong, not
 * money that moved. It exists so that fixing a typo is an auditable row rather
 * than an edit that quietly rewrites what the ledger said yesterday.
 */
export type PaymentType = "payment" | "refund" | "correction";

/**
 * How the money was recorded.
 *
 * `manual` is the founder entering a payment he received — mobile money, a
 * transfer, cash in hand. It is a **permanent capability, not a temporary
 * one**: it is what still works when a gateway is down, and what he uses when
 * a customer insists on paying a way no gateway covers.
 *
 * `gateway` becomes the visible path once one is live. Both write the same
 * table, which is the whole point — the dashboard reads one set of rows and
 * does not care which hand wrote them.
 */
export type PaymentMethod = "manual" | "gateway";

/**
 * Which moment in a commission's payment schedule this money answers to.
 *
 * A commission has no total until the design is agreed, so it is paid in three
 * gates: the **design fee** before he drafts, a payment to start **cutting**
 * once the design is agreed, and the **balance** on completion before it ships.
 *
 * The design fee is credited against the total. That is an accounting fact for
 * the layer that computes what is owed — this type only names which gate a row
 * belongs to, and carries no arithmetic.
 */
export type PaymentGate = "design_fee" | "cutting" | "balance";

/**
 * One money movement, as our table holds it.
 *
 * This row is the movement, not the price. What a piece costs — base, option
 * modifiers, any adjustment he made with a reason — is snapshotted on the
 * order at confirmation, so that changing a price tomorrow cannot rewrite what
 * someone agreed to today. This row says money arrived, left, or was
 * mis-entered.
 */
export interface PaymentRecord {
	/** Server-generated. */
	id: string;
	/** The order this money belongs to. */
	orderId: string;
	amount: Money;
	type: PaymentType;
	method: PaymentMethod;
	/**
	 * The gate this row satisfies, where there is one to name.
	 *
	 * Optional rather than required, because not every row answers to a gate.
	 * A collection order's schedule has a single entry — there is no other gate
	 * to distinguish it from, and labelling it with a commission's vocabulary
	 * (`cutting`, `balance`) would make any gate-filtered query read as though
	 * that order had a design step it never had. Refunds and corrections
	 * likewise reverse or fix rather than satisfy.
	 *
	 * Absent therefore has one meaning: no gate needs naming here. The ordered
	 * schedule itself lives on the order, snapshotted; this is a pointer into
	 * it, not a copy of it.
	 */
	gate?: PaymentGate;
	/**
	 * Set when the **customer** said they paid and he has not confirmed it yet.
	 *
	 * A reported payment is a payment row awaiting his eye — **never an order
	 * state**. It exists to close the silence between someone sending money and
	 * him noticing, without letting an unverified claim move the order forward.
	 * Money that has not been confirmed has not been received.
	 */
	reported: boolean;
	createdAt: Date;
}

/**
 * A payment fact as a caller supplies it, before the database has given it an
 * identity.
 *
 * Derived from {@link PaymentRecord} rather than written out again, so a
 * column added to the record cannot be forgotten here; named rather than left
 * as an inline `Omit`, so a call site reads as what it is.
 */
export type PaymentInput = Omit<PaymentRecord, "id" | "createdAt">;

/**
 * Every payment operation the app is allowed to perform. Rows we own, read
 * back and summed — no gateway calls anywhere in this shape.
 */
export interface Payments {
	/**
	 * Record that money moved, and return the stored row.
	 *
	 * The dashboard's manual entry today; a gateway webhook tomorrow, writing
	 * the same row through the same method. Recording is not confirming — a
	 * row with `reported` set is recorded and still waiting on him.
	 */
	record(input: PaymentInput): Promise<PaymentRecord>;

	/**
	 * Every payment fact for one order, for the money panel on the order screen
	 * and for the customer's own status page.
	 *
	 * An order with no payments yet returns `[]`, never `null` — no caller
	 * should have to distinguish "nothing paid" from "nothing there".
	 */
	forOrder(orderId: string): Promise<PaymentRecord[]>;

	/**
	 * The net paid on an order: payments add, refunds subtract.
	 *
	 * Always **derived from the rows**, never stored. A stored total is a
	 * second copy of the truth that drifts from the first, and the rows are the
	 * ones that have to be right.
	 *
	 * Returns {@link Money} rather than a bare number so the currency stays
	 * attached to the figure. A number that has lost its currency is a number
	 * that will eventually be printed beside the wrong symbol.
	 *
	 * How a `correction` participates is open until the schema lands — whether
	 * it carries a signed delta that simply adds, or supersedes the row it
	 * amends. Settled with the implementation, not guessed at here.
	 */
	total(orderId: string): Promise<Money>;
}

/**
 * The single body every method has until the schema and a gateway exist. One
 * thrower, so the real implementation replaces bodies and leaves the
 * signatures above untouched.
 *
 * Returns `never`, which is why it satisfies each method's return type without
 * any of them resolving to a fake success — the failure mode that matters most
 * here, since a payment that silently reports itself recorded is a piece
 * stitched for money that never arrived.
 */
function notImplemented(): never {
	throw new Error(
		"payments: not implemented — no gateway configured, dashboard entry pending schema (weekend)",
	);
}

/**
 * The adapter instance. The app imports this; when the schema lands, the
 * bodies below are filled in and nothing that imports them changes.
 */
export const payments: Payments = {
	record: notImplemented,
	forOrder: notImplemented,
	total: notImplemented,
};
