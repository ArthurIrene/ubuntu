// Everything one customer may see about their own order, read behind their
// token. **The only place on this site where measurements are rendered.**
//
// ## What this file will not load
//
// The reads below are deliberately narrow, and the omissions are the design:
//
// - **No token comes back out.** The caller already holds it — it is in the
//   path they typed — and a token in a returned object is a token one careless
//   `console.log` away from a server log *(R5)*.
// - **No event log.** The log is his audit trail and it is written in his
//   vocabulary. What the customer gets is the derived status and a sentence.
// - **No customer reference images.** They unlock in Phase 8, after he accepts.
// - **No maker.** The story page names and celebrates makers; an order page
//   naming the person who stitched it is a promise nobody has made yet.
//
// ## Redaction
//
// A redacted order still resolves — R1 requires past orders always to — and it
// resolves to an order with no name, no measurements and no age. That is the
// erasure working, not a hole: the values are null in the database and null is
// what renders *(R16)*.

import { and, asc, desc, eq } from "drizzle-orm";

import { fromCanonical, isMeasurementKey, MEASUREMENTS } from "@/content/measurements";
import { getDb, schema } from "@/db/client";
import type { Locale } from "@/lib/locale";
import {
	gates,
	netPaid,
	openGate,
	status,
	type OrderFacts,
	type PaymentGate,
	type Status,
} from "@/lib/order-state";

export interface OrderGate {
	gate: PaymentGate | null;
	/** Null while it is not yet knowable — *he confirms your final price*. */
	amount: number | null;
	/** Confirmed money against this gate. A reported claim is not money yet. */
	paid: number;
}

export interface OrderMeasurement {
	/**
	 * The row's own id. **The acknowledgement is bound to it**, so that ticking
	 * *it's right* confirms one specific number on one specific record and not
	 * "whatever the chest is now".
	 */
	id: string;
	key: string;
	label: string;
	/** The canonical integer, as stored. The acknowledgement is bound to it too. */
	canonical: number | null;
	/** In the unit they typed it in. Null once redacted. */
	value: number | null;
	/** The sentence that shipped beside the field on the day *(R7)*. */
	instruction: string;
	/** The guardrail fired and they said yes anyway. Both facts, both recorded. */
	warned: boolean;
	acknowledged: boolean;
}

export interface OrderFit {
	source: "self" | "guardian" | "tailor" | "standard" | "ours";
	unit: "cm" | "in";
	standardSize: string | null;
	/** **A number, never a date of birth** *(R13a)*. Null on an adult order. */
	ageYears: number | null;
	checked: boolean;
	measurements: OrderMeasurement[];
}

export interface OrderPhoto {
	id: string;
	width: number;
	height: number;
	focalX: number;
	focalY: number;
	alt: string | null;
}

export interface CustomerOrder {
	/** Internal, and never rendered. The report-a-payment action needs it. */
	id: string;
	kind: "collection" | "commission";
	/** Set at creation; every email is selected by it, and so is this page. */
	locale: Locale;
	currency: string;
	status: Status;
	customerName: string | null;

	/** Null on a commission until the design is agreed. **The emptiness is the product.** */
	pieceName: string | null;
	pieceSlug: string | null;
	/** Their own words, on a commission. Cleared on erasure. */
	brief: string | null;

	/** Base, every modifier, and the adjustment if he made one *(R3)*. */
	priceLines: { kind: string; label: string; amount: number }[];
	confirmedTotal: number | null;

	schedule: OrderGate[];
	netPaid: number;
	/** What is due now, or null when nothing is. */
	owed: OrderGate | null;
	/**
	 * They have said they paid and he has not seen it yet *(R4)*.
	 *
	 * **A payment row awaiting his eye, never an order state.** It is what the
	 * in-between view on the page renders, and it is why the page can be honest
	 * without inventing a status nobody decided on.
	 */
	hasReportedPayment: boolean;

	fit: OrderFit | null;
	photos: OrderPhoto[];
}

/**
 * One order, by the token in its path.
 *
 * `null` for a token that answers to nothing — which is the same 404 as a
 * malformed one, deliberately. A page that distinguishes *no such order* from
 * *not this order* is a page that answers questions about tokens it was not
 * asked.
 */
export async function orderForToken(token: string): Promise<CustomerOrder | null> {
	const db = await getDb();

	const [order] = await db
		.select({
			id: schema.orders.id,
			kind: schema.orders.kind,
			locale: schema.orders.locale,
			preferredChannel: schema.orders.preferredChannel,
			currency: schema.orders.currency,
			confirmedTotal: schema.orders.confirmedTotal,
			brief: schema.orders.brief,
			customerName: schema.customers.name,
			pieceName: schema.pieces.name,
			pieceSlug: schema.pieces.slug,
		})
		.from(schema.orders)
		.innerJoin(schema.customers, eq(schema.customers.id, schema.orders.customerId))
		.leftJoin(schema.pieces, eq(schema.pieces.id, schema.orders.pieceId))
		.where(eq(schema.orders.token, token))
		.limit(1);

	if (!order) return null;

	const [events, payments, schedule, fitRecords, priceLines, photos] = await Promise.all([
		db
			.select({
				type: schema.orderEvents.type,
				at: schema.orderEvents.at,
				note: schema.orderEvents.note,
			})
			.from(schema.orderEvents)
			.where(eq(schema.orderEvents.orderId, order.id))
			// Ordered for the same reason as the queue's read: the derived status
			// and the message rules read this as a sequence, not as a set.
			.orderBy(asc(schema.orderEvents.at)),
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
		// **Fit records append, never overwrite** *(R7)*, so the one that describes
		// the piece being made is the newest.
		db
			.select({
				id: schema.fitRecords.id,
				source: schema.fitRecords.source,
				unit: schema.fitRecords.unit,
				standardSize: schema.fitRecords.standardSize,
				ageYears: schema.fitRecords.ageYears,
				checkedAt: schema.fitRecords.checkedAt,
			})
			.from(schema.fitRecords)
			.where(eq(schema.fitRecords.orderId, order.id))
			.orderBy(desc(schema.fitRecords.createdAt))
			.limit(1),
		db
			.select({
				kind: schema.orderPriceLines.kind,
				label: schema.orderPriceLines.label,
				amount: schema.orderPriceLines.amount,
			})
			.from(schema.orderPriceLines)
			.where(eq(schema.orderPriceLines.orderId, order.id))
			.orderBy(asc(schema.orderPriceLines.position)),
		// **Progress photos only.** A customer's own reference image is theirs and
		// unlocks in Phase 8; there is no upload surface yet to have produced one.
		db
			.select({
				id: schema.orderImages.id,
				width: schema.orderImages.width,
				height: schema.orderImages.height,
				focalX: schema.orderImages.focalX,
				focalY: schema.orderImages.focalY,
				alt: schema.orderImages.alt,
			})
			.from(schema.orderImages)
			.where(
				and(eq(schema.orderImages.orderId, order.id), eq(schema.orderImages.kind, "progress")),
			)
			.orderBy(asc(schema.orderImages.position), asc(schema.orderImages.createdAt)),
	]);

	const fitRecord = fitRecords[0] ?? null;

	const measurements = fitRecord
		? await db
				.select({
					id: schema.fitMeasurements.id,
					measurementKey: schema.fitMeasurements.measurementKey,
					value: schema.fitMeasurements.value,
					label: schema.fitMeasurements.label,
					instruction: schema.fitMeasurements.instruction,
					warned: schema.fitMeasurements.warned,
					acknowledgedAt: schema.fitMeasurements.acknowledgedAt,
				})
				.from(schema.fitMeasurements)
				.where(eq(schema.fitMeasurements.fitRecordId, fitRecord.id))
				.orderBy(asc(schema.fitMeasurements.position))
		: [];

	const facts: OrderFacts = {
		kind: order.kind,
		preferredChannel: order.preferredChannel,
		events,
		payments,
		schedule,
		hasFitRecord: fitRecord !== null,
		fitChecked: fitRecord?.checkedAt != null,
	};

	return {
		id: order.id,
		kind: order.kind,
		locale: order.locale as Locale,
		currency: order.currency,
		status: status(facts),
		customerName: order.customerName,
		pieceName: order.pieceName,
		pieceSlug: order.pieceSlug,
		brief: order.brief,

		priceLines,
		confirmedTotal: order.confirmedTotal,

		schedule: gates(facts).map((entry) => ({
			gate: entry.gate,
			amount: entry.amount,
			paid: netPaid(facts, entry.gate),
		})),
		netPaid: netPaid(facts),
		owed: (() => {
			const open = openGate(facts);
			return open
				? { gate: open.gate, amount: open.amount, paid: netPaid(facts, open.gate) }
				: null;
		})(),
		hasReportedPayment: payments.some(
			(payment) => payment.reported && payment.confirmedAt === null,
		),

		fit: fitRecord
			? {
					source: fitRecord.source,
					unit: fitRecord.unit,
					standardSize: fitRecord.standardSize,
					ageYears: fitRecord.ageYears,
					checked: fitRecord.checkedAt !== null,
					measurements: measurements.map((row) => ({
						id: row.id,
						key: row.measurementKey,
						canonical: row.value,
						// The label snapshotted on the day is what they were shown, so it
						// is what they are shown back — even where we have since reworded
						// the definition in code.
						label: row.label,
						/*
						 * **Stored in millimetres, read back in the unit they typed**
						 * *(R7)*. Integers all the way through, the same discipline as
						 * money: a body measurement that has been through a float is a
						 * body measurement that can come back different.
						 *
						 * Null once redacted, and every column around it survives —
						 * because the label, the instruction and the ranges are facts
						 * about the form and only this is a fact about a body *(R16)*.
						 */
						value:
							row.value === null || !isMeasurementKey(row.measurementKey)
								? null
								: fromCanonical(row.value, fitRecord.unit, row.measurementKey),
						instruction: row.instruction,
						warned: row.warned,
						acknowledged: row.acknowledgedAt !== null,
					})),
				}
			: null,
		photos,
	};
}

/** The canonical unit a measurement is displayed in, for the suffix beside it. */
export function measurementUnitLabel(key: string, unit: "cm" | "in"): string {
	if (!isMeasurementKey(key)) return unit;
	return MEASUREMENTS[key].unit === "g" ? "kg" : unit;
}
