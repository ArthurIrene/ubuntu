"use server";

import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";

import { getDb, schema } from "@/db/client";
import { openGate, type OrderFacts } from "@/lib/order-state";

// *I've paid.* **The customer's half of report-then-confirm** *(R4)*.
//
// It writes **a payment row marked `reported`, and nothing else.** No event, no
// status, no email. Money that has not been confirmed has not been received, and
// an unverified claim moving an order forward is the one thing this shape exists
// to prevent — a piece stitched for money that never arrived.
//
// What it buys is the silence between someone sending money and him noticing.
// The row appears in his Today queue as *record a payment*, he confirms it, and
// only then does the derived status move and the *payment received* email fire.
//
// ## Ready for a gateway, by doing nothing special
//
// `method: "manual"` is the only line below that knows this was manual. When a
// gateway lands, its webhook writes this same table with `method: "gateway"` and
// a `confirmedAt` already set, because the provider has already done the
// confirming. **Nothing else here assumes a hand.** That is the whole of the
// integration-readiness requirement, and it is why it is one word.

/**
 * The token authenticates this write, and it is the only thing that does.
 *
 * **The path is the credential** *(R5)*. It arrives in a form field because the
 * form is on that order's own page; it is compared against the column and never
 * logged, never returned in an error, and never written into the row it creates.
 */
export async function reportPayment(form: FormData): Promise<void> {
	const token = String(form.get("token") ?? "");
	const reference = String(form.get("reference") ?? "").trim();

	if (!token) redirect("/");

	const db = await getDb();

	const [order] = await db
		.select({ id: schema.orders.id, kind: schema.orders.kind })
		.from(schema.orders)
		.where(eq(schema.orders.token, token))
		.limit(1);

	// A token that answers to nothing gets the same nothing a bad path gets.
	if (!order) redirect("/");

	const back = `/o/${token}`;

	const [payments, schedule] = await Promise.all([
		db
			.select({
				id: schema.payments.id,
				amount: schema.payments.amount,
				type: schema.payments.type,
				gate: schema.payments.gate,
				reported: schema.payments.reported,
				confirmedAt: schema.payments.confirmedAt,
				createdAt: schema.payments.createdAt,
			})
			.from(schema.payments)
			.where(eq(schema.payments.orderId, order.id)),
		db
			.select({
				gate: schema.orderPaymentSchedule.gate,
				amount: schema.orderPaymentSchedule.amount,
				position: schema.orderPaymentSchedule.position,
			})
			.from(schema.orderPaymentSchedule)
			.where(eq(schema.orderPaymentSchedule.orderId, order.id)),
	]);

	// **One claim at a time.** A second tap on a page that has already been
	// reloaded, or a browser replaying the POST, must not put two identical rows
	// in a queue whose whole claim is that it is exactly what is waiting on him.
	if (payments.some((payment) => payment.reported && payment.confirmedAt === null)) {
		redirect(back);
	}

	const facts: OrderFacts = {
		kind: order.kind,
		preferredChannel: "email",
		events: [],
		payments,
		schedule,
		hasFitRecord: false,
		fitChecked: false,
	};

	/*
	 * Which gate they have paid, and how much it asks for — read from the
	 * snapshot rather than from the form.
	 *
	 * **The amount is never a number they typed.** A claimed figure is not
	 * evidence, and a wrong one would arrive in his queue looking like a fact. A
	 * gate with no figure yet is not open at all, so *I've paid* cannot be
	 * offered before he has confirmed a price — which is also what the page says
	 * in words.
	 */
	const gate = openGate(facts);
	if (!gate || gate.amount === null) redirect(back);

	await db.insert(schema.payments).values({
		orderId: order.id,
		amount: gate.amount,
		type: "payment",
		method: "manual",
		gate: gate.gate,
		// The whole of it: recorded, and waiting on his eye.
		reported: true,
		confirmedAt: null,
		reference: reference || null,
	});

	// Post, redirect, get — so a refresh re-reads the page rather than replaying
	// the claim. The no-JS path is the only path here.
	redirect(back);
}

/**
 * *It's right — make it to these numbers.* **The second half of the three-band
 * guardrail** *(R7)*.
 *
 * An implausible value passes into the record already, marked `warned` and
 * unacknowledged. This is where the gentle question gets answered — on the
 * customer's own order page, because a soft guardrail needs a round trip and a
 * round trip needs the number to survive it, and **the only place a measurement
 * is allowed to survive anything is behind the token.** Not a URL, not a
 * cookie, not a hidden field bounced off a stranger's browser.
 *
 * **The acknowledgement is recorded, not merely accepted.** An unacknowledged
 * warning and an acknowledged one are different facts in a dispute — which is
 * also why this is a separate deliberate act rather than a checkbox ticked in
 * the same breath as the number. It is better evidence than the inline version
 * would have been.
 */
export async function acknowledgeMeasurement(form: FormData): Promise<void> {
	const token = String(form.get("token") ?? "");
	const measurementId = String(form.get("measurementId") ?? "");
	const canonical = String(form.get("canonical") ?? "");

	if (!token) redirect("/");
	const back = `/o/${token}`;
	if (!measurementId || !canonical) redirect(back);

	const db = await getDb();

	/*
	 * **Bound to the specific value being acknowledged.**
	 *
	 * The whole predicate is the authorisation and the binding at once: the row
	 * must belong to a fit record on the order this token opens, it must still
	 * hold the exact number that was shown, and it must actually carry a
	 * warning. Nothing is loaded and then checked.
	 *
	 * The value comparison is what makes this an acknowledgement of *a number*
	 * rather than of *a field*. Fit records append and never overwrite *(R7)*, so
	 * a later set of numbers is a new record whose warnings start unacknowledged
	 * — and a stale form left open in a tab cannot confirm a figure nobody is
	 * looking at any more.
	 */
	const value = Number(canonical);
	if (!Number.isInteger(value)) redirect(back);

	const [target] = await db
		.select({ id: schema.fitMeasurements.id })
		.from(schema.fitMeasurements)
		.innerJoin(
			schema.fitRecords,
			eq(schema.fitRecords.id, schema.fitMeasurements.fitRecordId),
		)
		.innerJoin(schema.orders, eq(schema.orders.id, schema.fitRecords.orderId))
		.where(
			and(
				eq(schema.fitMeasurements.id, measurementId),
				eq(schema.fitMeasurements.value, value),
				// The check constraint says an acknowledgement with no warning behind
				// it is a record of something that did not happen. This is the same
				// rule, enforced before the write rather than by the violation.
				eq(schema.fitMeasurements.warned, true),
				eq(schema.orders.token, token),
			),
		)
		.limit(1);

	if (!target) redirect(back);

	await db
		.update(schema.fitMeasurements)
		.set({ acknowledgedAt: new Date() })
		// Never re-stamp one already answered: the first answer is the one that
		// happened, and a refreshed POST must not move its timestamp.
		.where(
			and(
				eq(schema.fitMeasurements.id, target.id),
				isNull(schema.fitMeasurements.acknowledgedAt),
			),
		);

	redirect(back);
}
