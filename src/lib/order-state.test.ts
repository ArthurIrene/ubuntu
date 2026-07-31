import { describe, expect, it } from "vitest";

import {
	daysWaiting,
	netPaid,
	openGate,
	queueActions,
	status,
	waitingOnCustomer,
	type EventFact,
	type OrderFacts,
	type PaymentFact,
} from "./order-state";

const AT = new Date("2026-07-01T09:00:00Z");

function order(overrides: Partial<OrderFacts> = {}): OrderFacts {
	return {
		kind: "collection",
		preferredChannel: "email",
		events: [{ type: "requested", at: AT, note: null }],
		payments: [],
		schedule: [{ gate: null, amount: 50_000, position: 0 }],
		hasFitRecord: true,
		fitChecked: false,
		...overrides,
	};
}

const event = (type: EventFact["type"], note: string | null = null): EventFact => ({
	type,
	at: AT,
	note,
});

const paid = (overrides: Partial<PaymentFact> = {}): PaymentFact => ({
	id: "p1",
	amount: 50_000,
	type: "payment",
	gate: null,
	reported: false,
	confirmedAt: AT,
	createdAt: AT,
	...overrides,
});

describe("status", () => {
	it("starts at Requested", () => {
		expect(status(order())).toBe("requested");
	});

	it("keeps Paid and In the making separate", () => {
		const confirmed = order({
			events: [event("requested"), event("confirmed")],
			payments: [paid()],
		});
		expect(status(confirmed)).toBe("paid");

		expect(status({ ...confirmed, events: [...confirmed.events, event("making_started")] })).toBe(
			"in_the_making",
		);
	});

	it("does not reach Paid on an unconfirmed payment", () => {
		// A reported payment is a claim awaiting his eye, never an order state.
		const reported = order({
			events: [event("requested"), event("confirmed")],
			payments: [paid({ reported: true, confirmedAt: null })],
		});
		expect(status(reported)).toBe("confirmed");
	});

	it("derives In design from the design fee landing", () => {
		const commission = order({
			kind: "commission",
			events: [event("requested"), event("confirmed")],
			schedule: [
				{ gate: "design_fee", amount: 10_000, position: 0 },
				{ gate: "cutting", amount: 40_000, position: 1 },
				{ gate: "balance", amount: null, position: 2 },
			],
			payments: [paid({ amount: 10_000, gate: "design_fee" })],
		});
		expect(status(commission)).toBe("in_design");
	});

	it("lets an off-path ending win over everything", () => {
		const declined = order({ events: [event("requested"), event("confirmed"), event("declined")] });
		expect(status(declined)).toBe("declined");
	});
});

describe("netPaid", () => {
	it("subtracts a refund rather than inferring one from a negative row", () => {
		const facts = order({
			payments: [paid(), paid({ id: "p2", amount: 20_000, type: "refund" })],
		});
		expect(netPaid(facts)).toBe(30_000);
	});

	it("ignores a gate whose amount is not yet knowable — and does not call that paid", () => {
		const facts = order({
			kind: "commission",
			events: [event("requested"), event("confirmed")],
			schedule: [
				{ gate: "design_fee", amount: 10_000, position: 0 },
				{ gate: "balance", amount: null, position: 1 },
			],
			payments: [paid({ amount: 10_000, gate: "design_fee" })],
		});
		// Nothing is currently owed, because the balance has no figure yet. That
		// is not the same as paid, and reading it as paid would put an order into
		// the making before there was a price for the piece.
		expect(openGate(facts)).toBeNull();
		expect(status(facts)).toBe("in_design");
		expect(queueActions(facts).some((a) => a.key === "start_making")).toBe(false);
	});
});

describe("queueActions — membership is gate-based", () => {
	it("asks for a price on a new request, as a judgement", () => {
		const actions = queueActions(order());
		expect(actions).toEqual([{ key: "confirm_price", mode: "judgement" }]);
	});

	it("drops the row the moment he confirms", () => {
		const facts = order({ events: [event("requested"), event("confirmed")] });
		expect(queueActions(facts).some((a) => a.key === "confirm_price")).toBe(false);
	});

	it("raises a reported payment as a fact he completes inline", () => {
		const facts = order({
			events: [event("requested"), event("confirmed")],
			payments: [paid({ reported: true, confirmedAt: null })],
		});
		expect(queueActions(facts)).toEqual([
			{ key: "confirm_payment", mode: "fact", paymentId: "p1" },
		]);
	});

	it("opens the order to start the making, because the fit check gates it", () => {
		const facts = order({
			events: [event("requested"), event("confirmed")],
			payments: [paid()],
		});
		expect(queueActions(facts)).toEqual([{ key: "start_making", mode: "judgement" }]);
	});

	it("walks the errands: finished, posted, delivered", () => {
		const base = order({ events: [event("requested"), event("confirmed")], payments: [paid()] });

		const making = { ...base, events: [...base.events, event("making_started")] };
		expect(queueActions(making)).toEqual([{ key: "mark_complete", mode: "fact" }]);

		const complete = { ...making, events: [...making.events, event("making_complete")] };
		expect(queueActions(complete)).toEqual([{ key: "mark_shipped", mode: "fact" }]);

		const shipped = { ...complete, events: [...complete.events, event("shipped")] };
		expect(queueActions(shipped)).toEqual([{ key: "mark_delivered", mode: "fact" }]);

		const delivered = { ...shipped, events: [...shipped.events, event("delivered")] };
		expect(queueActions(delivered)).toEqual([]);
	});

	it("requires the WhatsApp draft when they chose WhatsApp, and not otherwise", () => {
		const events = [
			event("requested"),
			event("confirmed"),
			event("message_sent", "email:confirmed"),
		];

		const byEmail = order({ events, payments: [paid()] });
		expect(byEmail.preferredChannel).toBe("email");
		expect(queueActions(byEmail).some((a) => a.key === "send_whatsapp")).toBe(false);

		const byWhatsapp = order({ events, payments: [paid()], preferredChannel: "whatsapp" });
		expect(queueActions(byWhatsapp)).toContainEqual({
			key: "send_whatsapp",
			mode: "fact",
			emailKey: "confirmed",
		});

		const sent = {
			...byWhatsapp,
			events: [...events, event("message_sent", "whatsapp:confirmed")],
		};
		expect(queueActions(sent).some((a) => a.key === "send_whatsapp")).toBe(false);
	});

	it("raises a failed send, and clears it when a later one gets through", () => {
		const failed = order({
			events: [event("requested"), event("message_failed", "email:order_created")],
		});
		expect(queueActions(failed)).toContainEqual({
			key: "resend_failed",
			mode: "fact",
			emailKey: "order_created",
		});

		const recovered = {
			...failed,
			events: [...failed.events, event("message_sent", "email:order_created")],
		};
		expect(recovered.events.length).toBe(3);
		expect(queueActions(recovered).some((a) => a.key === "resend_failed")).toBe(false);
	});

	it("puts a bounce in his queue even though the send was accepted first", () => {
		// **The order these arrive in is the whole rule.** A bounce always
		// *follows* a successful hand-off: the provider accepted the message, and
		// the recipient's server rejected it minutes later. A rule that asks
		// "was this ever sent?" is therefore always answered yes exactly when a
		// bounce lands, and the row that should appear never does — which is the
		// silence R11 built the webhook to end.
		const bounced = order({
			events: [
				event("requested"),
				event("message_sent", "email:confirmed"),
				event("message_failed", "email:confirmed"),
			],
		});
		expect(queueActions(bounced)).toContainEqual({
			key: "resend_failed",
			mode: "fact",
			emailKey: "confirmed",
		});
	});

	it("offers one row however many times a message has bounced", () => {
		const twice = order({
			events: [
				event("requested"),
				event("message_sent", "email:confirmed"),
				event("message_failed", "email:confirmed"),
				event("message_sent", "email:confirmed"),
				event("message_failed", "email:confirmed"),
			],
		});
		expect(queueActions(twice).filter((a) => a.key === "resend_failed")).toHaveLength(1);
	});

	it("stops asking for anything once an order is declined", () => {
		const facts = order({ events: [event("requested"), event("declined")] });
		expect(queueActions(facts)).toEqual([]);
	});

	it("lists every move at once rather than one at a time", () => {
		// Complete and never truncated: a payment to record and a WhatsApp
		// message to send are two moves, and both appear.
		const facts = order({
			preferredChannel: "whatsapp",
			events: [
				event("requested"),
				event("confirmed"),
				event("message_sent", "email:confirmed"),
			],
			payments: [paid({ reported: true, confirmedAt: null })],
		});
		expect(queueActions(facts).map((a) => a.key)).toEqual(["confirm_payment", "send_whatsapp"]);
	});
});

describe("waitingOnCustomer", () => {
	it("is true when money is owed and nothing is waiting on him", () => {
		const facts = order({ events: [event("requested"), event("confirmed")] });
		expect(queueActions(facts)).toEqual([]);
		expect(waitingOnCustomer(facts)).toBe(true);
	});

	it("is false while a row of his own is open", () => {
		expect(waitingOnCustomer(order())).toBe(false);
	});

	it("is true between a design shared and a design agreed", () => {
		const facts = order({
			kind: "commission",
			events: [event("requested"), event("confirmed"), event("design_shared")],
			// The cutting payment and the balance have no figure until the design
			// is agreed, which is the whole reason a commission has three gates.
			schedule: [
				{ gate: "design_fee", amount: 10_000, position: 0 },
				{ gate: "cutting", amount: null, position: 1 },
				{ gate: "balance", amount: null, position: 2 },
			],
			payments: [paid({ amount: 10_000, gate: "design_fee" })],
		});
		expect(waitingOnCustomer(facts)).toBe(true);
	});
});

describe("daysWaiting", () => {
	it("counts from the last thing that happened, and never changes membership", () => {
		const facts = order();
		expect(daysWaiting(facts, new Date("2026-07-09T09:00:00Z"))).toBe(8);
		// The queue is identical however old the row is.
		expect(queueActions(facts)).toEqual([{ key: "confirm_price", mode: "judgement" }]);
	});
});

describe("the balance falls due before shipping, not before making", () => {
	// R6 pays a commission in three: the design fee before he drafts, a payment
	// to start cutting once the design is agreed, and the balance on completion.
	// R4 then refuses "awaiting balance" a state of its own, because paid-ness is
	// a separate dimension from the journey. Both together mean the balance is
	// outstanding for the whole time the piece is being made.
	const commission = (payments: PaymentFact[], events: EventFact["type"][]) =>
		order({
			kind: "commission",
			events: [event("requested"), event("confirmed"), ...events.map((type) => event(type))],
			schedule: [
				{ gate: "design_fee", amount: 10_000, position: 0 },
				{ gate: "cutting", amount: 40_000, position: 1 },
				{ gate: "balance", amount: 30_000, position: 2 },
			],
			payments,
		});

	const fee = paid({ id: "fee", amount: 10_000, gate: "design_fee" });
	const cutting = paid({ id: "cut", amount: 40_000, gate: "cutting" });
	const balance = paid({ id: "bal", amount: 30_000, gate: "balance" });

	it("reaches Paid with the balance still outstanding", () => {
		const facts = commission([fee, cutting], ["design_shared", "design_agreed"]);
		expect(status(facts)).toBe("paid");
		expect(queueActions(facts)).toEqual([{ key: "start_making", mode: "judgement" }]);
	});

	it("will not post it while the balance is open, and calls that waiting on them", () => {
		const facts = commission(
			[fee, cutting],
			["design_shared", "design_agreed", "making_started", "making_complete"],
		);
		expect(queueActions(facts).some((a) => a.key === "mark_shipped")).toBe(false);
		expect(waitingOnCustomer(facts)).toBe(true);
	});

	it("offers the post office the moment the balance lands", () => {
		const facts = commission(
			[fee, cutting, balance],
			["design_shared", "design_agreed", "making_started", "making_complete"],
		);
		expect(queueActions(facts)).toEqual([{ key: "mark_shipped", mode: "fact" }]);
		expect(waitingOnCustomer(facts)).toBe(false);
	});

	it("still holds a collection order to its single gate at both moments", () => {
		const unpaid = order({ events: [event("requested"), event("confirmed")] });
		expect(status(unpaid)).toBe("confirmed");
		expect(waitingOnCustomer(unpaid)).toBe(true);
	});
});
