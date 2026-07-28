// Assembling Today.
//
// **Today is a work queue, and it is the home screen** *(R9a)*. An order
// appears when the next move is his and leaves the moment he makes it. The
// rules live in `order-state.ts`, which is pure and tested; this file is the
// reading and the stitching, and it holds no rules of its own.
//
// **Complete and never truncated.** No top five, no pagination, no "show more".
// That is what makes forgetting structural rather than lucky, and it is the
// whole reason the queue was chosen over a table.

import { desc, eq, inArray } from "drizzle-orm";

import { getDb, schema } from "@/db/client";
import { whatsappDraft, type EmailKey } from "@/emails/order";
import type { Locale } from "@/lib/locale";
import { siteOrigin } from "@/lib/origin";
import {
	ACTION_ORDER,
	ACTION_HEADING,
	daysWaiting,
	gates,
	openGate,
	queueActions,
	status,
	STATUS_LABEL,
	waitingOnCustomer,
	type ActionKey,
	type OrderFacts,
	type QueueAction,
} from "@/lib/order-state";

/**
 * Which of the nine a row's completion sends, where it sends one.
 *
 * `mark_complete` is absent deliberately: *finished stitching* is a duration we
 * want recorded *(R6)* and not a moment the customer is told about — there are
 * nine emails and that is not one of them.
 */
const EMAIL_FOR: Partial<Record<ActionKey, EmailKey>> = {
	mark_shipped: "on_its_way",
	mark_delivered: "delivered",
	confirm_price: "confirmed",
	share_design: "design_shared",
	start_making: "in_the_making",
};

export interface QueueRow {
	orderId: string;
	action: QueueAction;
	/** What he calls them. Never a phone number, never an address. */
	customerName: string;
	/** The piece, or a stand-in while a commission has none yet *(R6)*. */
	pieceName: string;
	statusLabel: string;
	/** **Information only.** It never adds a row and never removes one *(R9a)*. */
	days: number;
	/**
	 * The pre-written `wa.me` draft, where the row has a message to carry.
	 *
	 * **The one place a token is allowed to reach the dashboard** *(R12d)* — it
	 * is in the href and never on the screen. Optional by default; required when
	 * they chose WhatsApp, which is what the `send_whatsapp` row is.
	 */
	whatsapp: string | null;
	/** What the row is about, for the sentence it renders. */
	amount: { value: number; currency: string } | null;
}

export interface QueueGroup {
	key: ActionKey;
	heading: string;
	rows: QueueRow[];
}

export interface Today {
	groups: QueueGroup[];
	/** One line at the foot, not mixed in among the rows *(R9a)*. */
	waitingOnCustomers: number;
	/** Every open order, whether or not it is waiting on anyone. */
	openOrders: number;
}

/**
 * Read every order and derive the queue.
 *
 * Five reads and a stitch in memory rather than one relational query. At the
 * volume this is written for — R9a's *filter every feature through the first
 * ten orders* — the join is not the cost, and five plain selects need no
 * relations table and stay legible.
 */
export async function today(now: Date = new Date()): Promise<Today> {
	const db = await getDb();
	const origin = await siteOrigin();

	const orders = await db
		.select({
			id: schema.orders.id,
			token: schema.orders.token,
			kind: schema.orders.kind,
			locale: schema.orders.locale,
			preferredChannel: schema.orders.preferredChannel,
			currency: schema.orders.currency,
			confirmedTotal: schema.orders.confirmedTotal,
			customerName: schema.customers.name,
			customerPhone: schema.customers.phone,
			redactedAt: schema.customers.redactedAt,
			pieceName: schema.pieces.name,
			createdAt: schema.orders.createdAt,
		})
		.from(schema.orders)
		.innerJoin(schema.customers, eq(schema.customers.id, schema.orders.customerId))
		.leftJoin(schema.pieces, eq(schema.pieces.id, schema.orders.pieceId))
		.orderBy(desc(schema.orders.createdAt));

	if (orders.length === 0) {
		return { groups: [], waitingOnCustomers: 0, openOrders: 0 };
	}

	const ids = orders.map((order) => order.id);

	const [events, payments, schedule, fits] = await Promise.all([
		db
			.select({
				orderId: schema.orderEvents.orderId,
				type: schema.orderEvents.type,
				at: schema.orderEvents.at,
				note: schema.orderEvents.note,
			})
			.from(schema.orderEvents)
			.where(inArray(schema.orderEvents.orderId, ids)),
		db
			.select({
				id: schema.payments.id,
				orderId: schema.payments.orderId,
				amount: schema.payments.amount,
				type: schema.payments.type,
				gate: schema.payments.gate,
				reported: schema.payments.reported,
				confirmedAt: schema.payments.confirmedAt,
				createdAt: schema.payments.createdAt,
			})
			.from(schema.payments)
			.where(inArray(schema.payments.orderId, ids)),
		db
			.select({
				orderId: schema.orderPaymentSchedule.orderId,
				gate: schema.orderPaymentSchedule.gate,
				amount: schema.orderPaymentSchedule.amount,
				position: schema.orderPaymentSchedule.position,
			})
			.from(schema.orderPaymentSchedule)
			.where(inArray(schema.orderPaymentSchedule.orderId, ids)),
		db
			.select({
				orderId: schema.fitRecords.orderId,
				checkedAt: schema.fitRecords.checkedAt,
				createdAt: schema.fitRecords.createdAt,
			})
			.from(schema.fitRecords)
			.where(inArray(schema.fitRecords.orderId, ids)),
	]);

	const by = <T extends { orderId: string }>(rows: T[]): Map<string, T[]> => {
		const map = new Map<string, T[]>();
		for (const row of rows) {
			const list = map.get(row.orderId);
			if (list) list.push(row);
			else map.set(row.orderId, [row]);
		}
		return map;
	};

	const eventsBy = by(events);
	const paymentsBy = by(payments);
	const scheduleBy = by(schedule);
	const fitsBy = by(fits);

	const groups = new Map<ActionKey, QueueRow[]>();
	let waitingOnCustomers = 0;
	let openOrders = 0;

	for (const order of orders) {
		const orderFits = fitsBy.get(order.id) ?? [];
		// Fit records append rather than overwrite *(R7)*, so the one that
		// matters is the newest.
		const latestFit = orderFits.reduce<(typeof orderFits)[number] | null>(
			(newest, fit) => (!newest || fit.createdAt > newest.createdAt ? fit : newest),
			null,
		);

		const facts: OrderFacts = {
			kind: order.kind,
			preferredChannel: order.preferredChannel,
			events: eventsBy.get(order.id) ?? [],
			payments: paymentsBy.get(order.id) ?? [],
			schedule: scheduleBy.get(order.id) ?? [],
			hasFitRecord: latestFit !== null,
			fitChecked: latestFit?.checkedAt != null,
		};

		const now_ = status(facts);
		const closed = now_ === "declined" || now_ === "lapsed" || now_ === "cancelled";
		if (!closed) openOrders += 1;

		if (waitingOnCustomer(facts)) waitingOnCustomers += 1;

		for (const action of queueActions(facts)) {
			const emailKey = action.emailKey ?? EMAIL_FOR[action.key] ?? null;

			const payment = action.paymentId
				? facts.payments.find((row) => row.id === action.paymentId)
				: undefined;

			const owed = openGate(facts);
			const amount = payment
				? { value: payment.amount, currency: order.currency }
				: owed?.amount != null
					? { value: owed.amount, currency: order.currency }
					: order.confirmedTotal != null
						? { value: order.confirmedTotal, currency: order.currency }
						: null;

			const row: QueueRow = {
				orderId: order.id,
				action,
				customerName: order.customerName ?? "A customer",
				pieceName: order.pieceName ?? (order.kind === "commission" ? "a commission" : "a piece"),
				statusLabel: STATUS_LABEL[now_],
				days: daysWaiting(facts, now),
				amount,
				whatsapp:
					emailKey && order.customerPhone && !order.redactedAt
						? whatsappDraft(emailKey, order.locale as Locale, order.customerPhone, {
								name: order.customerName ?? "",
								piece: order.pieceName ?? undefined,
								amount,
								days: null,
								link: `${origin}/o/${order.token}`,
							})
						: null,
			};

			const list = groups.get(action.key);
			if (list) list.push(row);
			else groups.set(action.key, [row]);
		}
	}

	return {
		// Grouped by action with a count per heading — *confirm a price · 3*.
		// At twelve items a flat list of sentences is a wall; grouped, he batches
		// instead of context-switching between pricing and packing.
		groups: ACTION_ORDER.filter((key) => groups.has(key)).map((key) => ({
			key,
			heading: ACTION_HEADING[key],
			rows: groups.get(key) ?? [],
		})),
		waitingOnCustomers,
		openOrders,
	};
}

/** Re-exported so the page does not have to know two modules. */
export { gates };
