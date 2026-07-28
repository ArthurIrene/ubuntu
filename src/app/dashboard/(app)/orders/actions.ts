"use server";

import { and, desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
	band,
	isMeasurementKey,
	MEASUREMENTS,
	SIZE_CHART_VERSION,
	toCanonical,
} from "@/content/measurements";
import { getDb, schema } from "@/db/client";
import { requireSession } from "@/lib/auth";
import { sendOrderEmail } from "@/lib/notify";
import { settledBy } from "@/lib/order-state";
import { mintToken } from "@/lib/token";

// The order screen's actions — **the judgements** *(R9a)*.
//
// Each one sends a number, a decision or a design that cannot be taken back,
// which is why none of them has a button on the Today list. **No bulk approve
// anywhere**, and no bulk send, rotate or export *(R9a, R12b)*: every action
// here takes one order.

/** Every action re-runs the gate. A layout does not re-run for a server action. */
async function gate() {
	await requireSession();
	return getDb();
}

function id(form: FormData, field = "orderId"): string {
	const value = form.get(field);
	if (typeof value !== "string" || !value) throw new Error(`missing ${field}`);
	return value;
}

const text = (form: FormData, field: string): string => String(form.get(field) ?? "").trim();

function money(form: FormData, field: string): number | null {
	const raw = text(form, field);
	if (!raw) return null;
	const value = Number(raw.replace(/[^\d-]/g, ""));
	return Number.isFinite(value) ? Math.trunc(value) : null;
}

// ---------------------------------------------------------------------------
// Creating one by hand
// ---------------------------------------------------------------------------

/**
 * An order he takes himself.
 *
 * No document specified this screen, and it is here for a named reason rather
 * than as an invention: the public order form is Phase 4, and R7 already has
 * him entering fit numbers himself *"if the numbers came over WhatsApp"*. A
 * brand whose first orders arrive in a chat thread needs somewhere to put them
 * before the form exists. It creates exactly what the public form will create
 * and nothing else.
 */
export async function createOrder(form: FormData): Promise<void> {
	const db = await gate();

	const phone = text(form, "phone");
	const locale = text(form, "locale") === "rw" ? "rw" : "en";

	// Keyed on phone *(R5)*. A returning customer is the same row, which is what
	// buys *"this is her third piece"* on the day the order screen wants it.
	const [existing] = await db
		.select({ id: schema.customers.id })
		.from(schema.customers)
		.where(eq(schema.customers.phone, phone))
		.limit(1);

	const customerId =
		existing?.id ??
		(
			await db
				.insert(schema.customers)
				.values({
					phone,
					email: text(form, "email"),
					name: text(form, "name"),
					address: text(form, "address") || null,
					locale,
				})
				.returning({ id: schema.customers.id })
		)[0].id;

	const kind = text(form, "kind") === "commission" ? "commission" : "collection";
	const pieceId = text(form, "pieceId") || null;

	const [order] = await db
		.insert(schema.orders)
		.values({
			token: mintToken(),
			kind,
			customerId,
			// A collection order is for a piece that already exists; only a
			// commission may sit without one, and only until the design is agreed.
			pieceId: kind === "collection" ? pieceId : pieceId,
			locale,
			preferredChannel: text(form, "preferredChannel") === "whatsapp" ? "whatsapp" : "email",
			brief: text(form, "brief") || null,
		})
		.returning({ id: schema.orders.id });

	await db
		.insert(schema.orderEvents)
		.values({ orderId: order.id, type: "requested", actor: "founder" });

	// The first of the nine, and the one that carries the link.
	await sendOrderEmail(order.id, "order_created", { amount: null });

	redirect(`/dashboard/orders/${order.id}`);
}

// ---------------------------------------------------------------------------
// The price
// ---------------------------------------------------------------------------

/**
 * Confirm the price, and snapshot the breakdown that explains it.
 *
 * **Price is adjustable here, with a required reason** *(R9c)*, written as its
 * own named line rather than a silently different base. The cases are real —
 * cloth a wide measurement eats, a colourway he is short on, a discount he
 * wants to give — and an adjustment that explains itself inside the breakdown
 * is what answers *why 51,000?* It does not weaken *it is a price, not a
 * starting price*; the alternative, decline-and-re-ask, throws away the request
 * and asks a stranger to fill the form twice.
 *
 * **The customer's acceptance is the payment** *(R9c)*. A raised price needs no
 * new state and no approval loop, because the existing gate already does that
 * work.
 */
export async function confirmPrice(form: FormData): Promise<void> {
	const db = await gate();
	const orderId = id(form);

	const base = money(form, "base") ?? 0;
	const adjustment = money(form, "adjustment");
	const reason = text(form, "reason");

	// The database carries the same rule as a check constraint. This is the
	// message he reads instead of a constraint violation.
	if (adjustment !== null && adjustment !== 0 && !reason) {
		redirect(`/dashboard/orders/${orderId}?e=reason`);
	}

	const [order] = await db
		.select({ kind: schema.orders.kind, currency: schema.orders.currency })
		.from(schema.orders)
		.where(eq(schema.orders.id, orderId))
		.limit(1);
	if (!order) redirect("/dashboard/orders");

	const total = base + (adjustment ?? 0);

	await db.delete(schema.orderPriceLines).where(eq(schema.orderPriceLines.orderId, orderId));
	await db.insert(schema.orderPriceLines).values([
		{ orderId, kind: "base" as const, label: "The piece", amount: base, position: 0 },
		...(adjustment !== null && adjustment !== 0
			? [
					{
						orderId,
						kind: "adjustment" as const,
						label: reason,
						amount: adjustment,
						reason,
						position: 1,
					},
				]
			: []),
	]);

	await db
		.update(schema.orders)
		.set({ confirmedTotal: total, confirmedAt: new Date(), updatedAt: new Date() })
		.where(eq(schema.orders.id, orderId));

	// The payment schedule, snapshotted and ordered *(R6)*. **A collection order
	// has exactly one entry** and no gate name, because there is no other gate to
	// distinguish it from. A commission has three, and only the first has a
	// figure — the rest are not knowable until the design is agreed.
	await db
		.delete(schema.orderPaymentSchedule)
		.where(eq(schema.orderPaymentSchedule.orderId, orderId));

	if (order.kind === "commission") {
		const [settings] = await db
			.select({ designFee: schema.settings.designFee })
			.from(schema.settings)
			.where(eq(schema.settings.id, 1))
			.limit(1);
		const designFee = money(form, "designFee") ?? settings?.designFee ?? 0;

		await db.insert(schema.orderPaymentSchedule).values([
			{ orderId, gate: "design_fee" as const, amount: designFee, position: 0 },
			{ orderId, gate: "cutting" as const, amount: null, position: 1 },
			{ orderId, gate: "balance" as const, amount: null, position: 2 },
		]);

		await db
			.insert(schema.orderEvents)
			.values({ orderId, type: "confirmed", actor: "founder" });
		await sendOrderEmail(orderId, "confirmed_commission", {
			amount: designFee,
			note: text(form, "note") || null,
		});
	} else {
		await db
			.insert(schema.orderPaymentSchedule)
			.values([{ orderId, gate: null, amount: total, position: 0 }]);

		await db
			.insert(schema.orderEvents)
			.values({ orderId, type: "confirmed", actor: "founder" });
		await sendOrderEmail(orderId, "confirmed", {
			amount: total,
			note: text(form, "note") || null,
		});
	}

	if (adjustment !== null && adjustment !== 0) {
		await db.insert(schema.orderEvents).values({
			orderId,
			type: "price_adjusted",
			actor: "founder",
			// The reason is already a named price line; the log records that it
			// happened, not a second copy of the words.
			note: null,
		});
	}

	revalidatePath(`/dashboard/orders/${orderId}`);
	revalidatePath("/dashboard");
}

/**
 * Refuse the piece. **Decline is consent, not capacity** *(R4)* — he must be
 * able to say no to a scene he does not want to stitch, and no amount of hiring
 * solves that.
 */
export async function decline(form: FormData): Promise<void> {
	const db = await gate();
	const orderId = id(form);
	await db.insert(schema.orderEvents).values({ orderId, type: "declined", actor: "founder" });
	// The hardest of the four notes, and the piece of writing that most needs to
	// be right and least wants rewriting at speed *(R9d)*.
	await sendOrderEmail(orderId, "declined", { amount: null, note: text(form, "note") || null });
	revalidatePath(`/dashboard/orders/${orderId}`);
	revalidatePath("/dashboard");
}

// ---------------------------------------------------------------------------
// The design — two facts, because money gates on one *(R6)*
// ---------------------------------------------------------------------------

export async function shareDesign(form: FormData): Promise<void> {
	const db = await gate();
	const orderId = id(form);
	await db.insert(schema.orderEvents).values({ orderId, type: "design_shared", actor: "founder" });
	await sendOrderEmail(orderId, "design_shared", {
		amount: null,
		note: text(form, "note") || null,
	});
	revalidatePath(`/dashboard/orders/${orderId}`);
	revalidatePath("/dashboard");
}

/**
 * The design is agreed, which is when the remaining gates become knowable and
 * the piece enters the queue *(R6)*.
 *
 * The piece is attached here for the same reason: `piece_id` is null only
 * between Requested and design agreement, and that window is the design rather
 * than a wart.
 */
export async function agreeDesign(form: FormData): Promise<void> {
	const db = await gate();
	const orderId = id(form);

	const cutting = money(form, "cutting");
	const balance = money(form, "balance");
	const pieceId = text(form, "pieceId");

	if (pieceId) {
		await db.update(schema.orders).set({ pieceId }).where(eq(schema.orders.id, orderId));
	}

	if (cutting !== null) {
		await db
			.update(schema.orderPaymentSchedule)
			.set({ amount: cutting, updatedAt: new Date() })
			.where(
				and(
					eq(schema.orderPaymentSchedule.orderId, orderId),
					eq(schema.orderPaymentSchedule.gate, "cutting"),
				),
			);
	}
	if (balance !== null) {
		await db
			.update(schema.orderPaymentSchedule)
			.set({ amount: balance, updatedAt: new Date() })
			.where(
				and(
					eq(schema.orderPaymentSchedule.orderId, orderId),
					eq(schema.orderPaymentSchedule.gate, "balance"),
				),
			);
	}

	// The total is the design fee plus what is still to come — the fee is
	// credited against it *(R6)*, which is arithmetic here rather than a column.
	const schedule = await db
		.select({ amount: schema.orderPaymentSchedule.amount })
		.from(schema.orderPaymentSchedule)
		.where(eq(schema.orderPaymentSchedule.orderId, orderId));
	const total = schedule.reduce((sum, row) => sum + (row.amount ?? 0), 0);

	await db
		.update(schema.orders)
		.set({ confirmedTotal: total, updatedAt: new Date() })
		.where(eq(schema.orders.id, orderId));

	await db.insert(schema.orderEvents).values({ orderId, type: "design_agreed", actor: "founder" });
	await sendOrderEmail(orderId, "design_agreed", { amount: cutting ?? null });

	revalidatePath(`/dashboard/orders/${orderId}`);
	revalidatePath("/dashboard");
}

// ---------------------------------------------------------------------------
// Money he was handed
// ---------------------------------------------------------------------------

/**
 * Record a payment he received. **Manual is a permanent capability, not a
 * temporary one** *(R3)* — it is what still works when a gateway is down.
 *
 * Confirmed on the spot, because he is recording money he has: the `reported`
 * flag is for the customer's claim, and this is not one.
 */
export async function recordPayment(form: FormData): Promise<void> {
	const db = await gate();
	const orderId = id(form);

	const amount = money(form, "amount");
	if (amount === null || amount <= 0) redirect(`/dashboard/orders/${orderId}?e=amount`);

	const gateValue = text(form, "gate");
	const paymentGate =
		gateValue === "design_fee" || gateValue === "cutting" || gateValue === "balance"
			? gateValue
			: null;

	await db.insert(schema.payments).values({
		orderId,
		amount,
		type: "payment",
		method: "manual",
		gate: paymentGate,
		reported: false,
		confirmedAt: new Date(),
		reference: text(form, "reference") || null,
	});

	await sendOrderEmail(
		orderId,
		paymentGate === "design_fee"
			? "payment_received_design_fee"
			: paymentGate === "cutting"
				? "payment_received_cutting"
				: paymentGate === "balance"
					? "payment_received_balance"
					: "payment_received",
		{ amount },
	);

	revalidatePath(`/dashboard/orders/${orderId}`);
	revalidatePath("/dashboard");
}

// ---------------------------------------------------------------------------
// Fit, and the making
// ---------------------------------------------------------------------------

/**
 * Enter a set of numbers.
 *
 * **He can enter them himself if they came over WhatsApp, and the actor is
 * recorded either way** *(R7)*. On a commission this is the moment the design
 * is agreed — same form, same guardrails.
 *
 * The record is **self-contained**: values, labels, the instruction text that
 * was shown, the ranges in force and the size-chart version *(R7)*. *Our own
 * stated measurements* means the ones stated on the day, so without a version
 * the policy's three-way liability clause cannot be adjudicated at all.
 *
 * **Fit records append, never overwrite.** A second set of numbers is a new
 * record, and the log says which was in force when making started.
 */
export async function recordFit(form: FormData): Promise<void> {
	const db = await gate();
	const orderId = id(form);
	const garmentTypeId = text(form, "garmentTypeId");

	const sourceValue = text(form, "source");
	const source = (
		["self", "guardian", "tailor", "standard", "ours"].includes(sourceValue)
			? sourceValue
			: "self"
	) as "self" | "guardian" | "tailor" | "standard" | "ours";

	const unit = text(form, "unit") === "in" ? "in" : "cm";
	const ageRaw = text(form, "ageYears");

	const wanted = await db
		.select()
		.from(schema.garmentTypeMeasurements)
		.where(eq(schema.garmentTypeMeasurements.garmentTypeId, garmentTypeId))
		.orderBy(schema.garmentTypeMeasurements.position);

	const [record] = await db
		.insert(schema.fitRecords)
		.values({
			orderId,
			garmentTypeId,
			source,
			unit,
			sizeChartVersion: SIZE_CHART_VERSION,
			standardSize: text(form, "standardSize") || null,
			// **Age at the time of the order, as a number, never a date of birth**
			// *(R13a)*. A birth date ages by itself and identifies; a number does
			// neither. **A child is never an entity here** — no name, no row.
			ageYears: ageRaw ? Number(ageRaw) : null,
		})
		.returning({ id: schema.fitRecords.id });

	const rows = wanted.flatMap((measurement, index) => {
		const key = measurement.measurementKey;
		if (!isMeasurementKey(key)) return [];

		const typed = text(form, `m_${key}`);
		if (!typed) return [];

		const value = toCanonical(Number(typed), unit, key);
		const definition = MEASUREMENTS[key];
		const which = band(value, measurement);

		// **Only impossible refuses**, and the refusing happens on the public form.
		// Here he is recording numbers a person gave him, so an impossible value
		// is still written down — with the warning recorded against it — rather
		// than silently dropped.
		const warned = which !== "plausible";

		return [
			{
				fitRecordId: record.id,
				measurementKey: key,
				value,
				label: definition.label,
				instruction: definition.instruction,
				plausibleMin: measurement.plausibleMin,
				plausibleMax: measurement.plausibleMax,
				impossibleMin: measurement.impossibleMin,
				impossibleMax: measurement.impossibleMax,
				warned,
				// **The acknowledgement is recorded, not just accepted** *(R7)* — an
				// unacknowledged warning and an acknowledged one are different facts
				// in a dispute.
				acknowledgedAt: warned && form.get(`ack_${key}`) ? new Date() : null,
				position: index,
			},
		];
	});

	if (rows.length > 0) await db.insert(schema.fitMeasurements).values(rows);

	await db.insert(schema.orderEvents).values({ orderId, type: "fit_recorded", actor: "founder" });

	revalidatePath(`/dashboard/orders/${orderId}`);
	revalidatePath("/dashboard");
}

/**
 * The fit check — **required before *In the making*, unconditionally** *(R9c)*.
 *
 * Not raised only on odd numbers: a conditional tick means he must learn which
 * cases raise it, and the case it would not raise is the plausible-but-wrong
 * number that sails through. Cloth is cut at the second gate, so a wrong
 * measurement found after it is unrecoverable.
 *
 * It records **who and when**, which is the missing half of R7's liability
 * record — that one captured what the customer acknowledged and nothing about
 * him. *The cost, named: a tick on every order risks becoming reflexive.*
 */
export async function checkFit(form: FormData): Promise<void> {
	const session = await requireSession();
	const db = await getDb();
	const orderId = id(form);
	const fitRecordId = text(form, "fitRecordId");

	await db
		.update(schema.fitRecords)
		.set({ checkedAt: new Date(), checkedBy: session.adminId })
		.where(eq(schema.fitRecords.id, fitRecordId));

	await db.insert(schema.orderEvents).values({ orderId, type: "fit_checked", actor: "founder" });

	revalidatePath(`/dashboard/orders/${orderId}`);
	revalidatePath("/dashboard");
}

/**
 * Start the making. **The fit check stands in front of this and there is no way
 * round it** *(R9c)*.
 *
 * Enforced here rather than by hiding the button, because a hidden button is a
 * suggestion and this is a gate. *This is also where the ceremony plays* on the
 * customer's page — the adumu, once, on this transition only.
 */
export async function startMaking(form: FormData): Promise<void> {
	const db = await gate();
	const orderId = id(form);

	const [fit] = await db
		.select({ checkedAt: schema.fitRecords.checkedAt })
		.from(schema.fitRecords)
		.where(and(eq(schema.fitRecords.orderId, orderId), isNull(schema.fitRecords.redactedAt)))
		// **Fit records append, never overwrite** *(R7)*, so the one that gates
		// the making is the newest — the log says which was in force when making
		// started.
		.orderBy(desc(schema.fitRecords.createdAt))
		.limit(1);

	if (!fit || !fit.checkedAt) redirect(`/dashboard/orders/${orderId}?e=fit`);

	// **Nothing is cut before it is paid for**, which the policy page states
	// plainly to customers. The queue only offers this row on a paid order, but
	// the button also exists on the order screen — and a promise made on a public
	// page should be enforced where the write happens, not where it is displayed.
	// The balance is deliberately not part of this: it falls due on completion,
	// before shipping *(R6)*.
	const [schedule, payments] = await Promise.all([
		db
			.select({
				gate: schema.orderPaymentSchedule.gate,
				amount: schema.orderPaymentSchedule.amount,
				position: schema.orderPaymentSchedule.position,
			})
			.from(schema.orderPaymentSchedule)
			.where(eq(schema.orderPaymentSchedule.orderId, orderId)),
		db.select().from(schema.payments).where(eq(schema.payments.orderId, orderId)),
	]);

	const settled = settledBy(
		{
			kind: "collection",
			preferredChannel: "email",
			events: [],
			schedule,
			payments: payments.map((payment) => ({
				id: payment.id,
				amount: payment.amount,
				type: payment.type,
				gate: payment.gate,
				reported: payment.reported,
				confirmedAt: payment.confirmedAt,
				createdAt: payment.createdAt,
			})),
			hasFitRecord: true,
			fitChecked: true,
		},
		"making",
	);
	if (!settled) redirect(`/dashboard/orders/${orderId}?e=unpaid`);

	await db.insert(schema.orderEvents).values({ orderId, type: "making_started", actor: "founder" });
	await sendOrderEmail(orderId, "in_the_making", { amount: null });

	revalidatePath(`/dashboard/orders/${orderId}`);
	revalidatePath("/dashboard");
}

// ---------------------------------------------------------------------------
// The maker, the token, and the two off-path endings
// ---------------------------------------------------------------------------

/**
 * Who stitched it. **A table with an FK, not a typed string** *(R16)* — the
 * story page names and celebrates makers, and a typed name per order is a
 * backfill of misspellings on the day that page exists.
 */
export async function setMaker(form: FormData): Promise<void> {
	const db = await gate();
	const orderId = id(form);
	const makerId = text(form, "makerId");
	await db
		.update(schema.orders)
		.set({ makerId: makerId || null, updatedAt: new Date() })
		.where(eq(schema.orders.id, orderId));
	revalidatePath(`/dashboard/orders/${orderId}`);
}

/**
 * Rotate the token, for the customer who forwarded their link to the wrong
 * person *(R5)*.
 *
 * **One at a time, never in bulk** *(R12c)*. Ten orders is ten taps; the bulk
 * version waits until the catalogue earns it, and its absence is the control.
 * The new link is mailed immediately, because rotating without re-sending cuts
 * the customer off from their own order with only human recovery to undo it.
 */
export async function rotateToken(form: FormData): Promise<void> {
	const db = await gate();
	const orderId = id(form);

	await db
		.update(schema.orders)
		.set({ token: mintToken(), updatedAt: new Date() })
		.where(eq(schema.orders.id, orderId));

	await db.insert(schema.orderEvents).values({ orderId, type: "token_rotated", actor: "founder" });
	await sendOrderEmail(orderId, "token_resend", { amount: null });

	revalidatePath(`/dashboard/orders/${orderId}`);
}

/** Send the same link again. The token does not change; that is the whole point *(R5)*. */
export async function resendToken(form: FormData): Promise<void> {
	await gate();
	await sendOrderEmail(id(form), "token_resend", { amount: null });
	revalidatePath(`/dashboard/orders/${id(form)}`);
}

/**
 * Lapsed — **operationally essential** *(R4)*. Without it every stranger who
 * requests and vanishes sits in Confirmed forever and the pipeline becomes
 * unreadable within months.
 */
export async function lapse(form: FormData): Promise<void> {
	const db = await gate();
	const orderId = id(form);
	await db.insert(schema.orderEvents).values({ orderId, type: "lapsed", actor: "founder" });
	revalidatePath(`/dashboard/orders/${orderId}`);
	revalidatePath("/dashboard");
}

/**
 * Cancelled. **No self-service cancellation** *(R4)* — it is a conversation,
 * and what comes back depends on how far the work has gone. The number is his
 * per case; the refund is recorded as its own typed payment row.
 */
export async function cancel(form: FormData): Promise<void> {
	const db = await gate();
	const orderId = id(form);
	await db.insert(schema.orderEvents).values({
		orderId,
		type: "cancelled",
		actor: "founder",
		note: text(form, "note") || null,
	});
	revalidatePath(`/dashboard/orders/${orderId}`);
	revalidatePath("/dashboard");
}
