import Link from "next/link";
import { and, asc, countDistinct, desc, eq, gte } from "drizzle-orm";

import { getDb, schema } from "@/db/client";
import { formatMoney } from "@/emails/order";
import { requireSession } from "@/lib/auth";
import { status, STATUS_LABEL, type OrderFacts } from "@/lib/order-state";

import { createOrder } from "./actions";

export const dynamic = "force-dynamic";

/** How far back *recently* reaches. Long enough to see drift, short enough to mean something. */
const RECENT_DAYS = 30;

/**
 * Orders — **one pipeline, filtered** *(R6)*.
 *
 * There is no separate commissions section: a commission is the same machinery
 * pointed at a piece that does not exist yet, and giving it its own list would
 * be the first place the two could drift apart.
 */
export default async function Orders({
	searchParams,
}: {
	searchParams: Promise<{ kind?: string }>;
}) {
	await requireSession();
	const { kind } = await searchParams;
	const db = await getDb();

	const filter =
		kind === "commission" ? "commission" : kind === "collection" ? "collection" : null;

	const rows = await db
		.select({
			id: schema.orders.id,
			kind: schema.orders.kind,
			currency: schema.orders.currency,
			confirmedTotal: schema.orders.confirmedTotal,
			createdAt: schema.orders.createdAt,
			customerName: schema.customers.name,
			pieceName: schema.pieces.name,
		})
		.from(schema.orders)
		.innerJoin(schema.customers, eq(schema.customers.id, schema.orders.customerId))
		.leftJoin(schema.pieces, eq(schema.pieces.id, schema.orders.pieceId))
		.where(filter ? eq(schema.orders.kind, filter) : undefined)
		.orderBy(desc(schema.orders.createdAt));

	// **A count of recently adjusted orders** *(R9c)*, so drift back toward
	// "from" pricing is visible rather than gradual. It is a number he reads, not
	// a threshold that fires — R9a refused guessed thresholds and this is not one.
	const since = new Date(Date.now() - RECENT_DAYS * 86_400_000);
	const [adjusted] = await db
		.select({ count: countDistinct(schema.orderEvents.orderId) })
		.from(schema.orderEvents)
		.where(
			and(eq(schema.orderEvents.type, "price_adjusted"), gte(schema.orderEvents.at, since)),
		);

	const [pieces, commissionPieces] = await Promise.all([
		db
			.select({ id: schema.pieces.id, name: schema.pieces.name })
			.from(schema.pieces)
			.where(eq(schema.pieces.kind, "collection"))
			.orderBy(asc(schema.pieces.name)),
		db
			.select({ id: schema.pieces.id, name: schema.pieces.name })
			.from(schema.pieces)
			.where(eq(schema.pieces.kind, "commission"))
			.orderBy(asc(schema.pieces.name)),
	]);

	// Status is derived, so the list needs the log and the payments behind each
	// row. Two reads rather than one per order.
	const events = await db
		.select({
			orderId: schema.orderEvents.orderId,
			type: schema.orderEvents.type,
			at: schema.orderEvents.at,
			note: schema.orderEvents.note,
		})
		.from(schema.orderEvents);
	const payments = await db.select().from(schema.payments);
	const schedule = await db.select().from(schema.orderPaymentSchedule);

	const label = (orderId: string, orderKind: "collection" | "commission") => {
		const facts: OrderFacts = {
			kind: orderKind,
			preferredChannel: "email",
			events: events.filter((event) => event.orderId === orderId),
			payments: payments
				.filter((payment) => payment.orderId === orderId)
				.map((payment) => ({
					id: payment.id,
					amount: payment.amount,
					type: payment.type,
					gate: payment.gate,
					reported: payment.reported,
					confirmedAt: payment.confirmedAt,
					createdAt: payment.createdAt,
				})),
			schedule: schedule
				.filter((row) => row.orderId === orderId)
				.map((row) => ({ gate: row.gate, amount: row.amount, position: row.position })),
			hasFitRecord: false,
			fitChecked: false,
		};
		return STATUS_LABEL[status(facts)];
	};

	return (
		<main>
			<h1>Orders</h1>

			<p>
				<Link href="/dashboard/orders">All</Link> ·{" "}
				<Link href="/dashboard/orders?kind=collection">Collection</Link> ·{" "}
				<Link href="/dashboard/orders?kind=commission">Only yours</Link>
			</p>

			<p>
				{adjusted?.count ?? 0} price{(adjusted?.count ?? 0) === 1 ? "" : "s"} adjusted in the last{" "}
				{RECENT_DAYS} days.
			</p>

			<ul>
				{rows.map((row) => (
					<li key={row.id}>
						<Link href={`/dashboard/orders/${row.id}`}>
							{row.customerName ?? "A redacted customer"} — {row.pieceName ?? "a commission"}
						</Link>{" "}
						· {label(row.id, row.kind)}
						{row.confirmedTotal !== null &&
							` · ${formatMoney({ value: row.confirmedTotal, currency: row.currency })}`}
						· {row.createdAt.toISOString().slice(0, 10)}
					</li>
				))}
				{rows.length === 0 && <li>None yet.</li>}
			</ul>

			{/*
			 * Entering one by hand. No document specified this, and it is here for a
			 * named reason: the public order form is Phase 4, and R7 already has him
			 * entering fit numbers himself when they arrived over WhatsApp. It
			 * creates exactly what the public form will create.
			 */}
			<details>
				<summary>Take an order yourself</summary>
				<form action={createOrder}>
					<label htmlFor="name">Name</label>
					<input id="name" name="name" type="text" required />

					{/* **Email and phone are both required** *(R5)*. */}
					<label htmlFor="phone">Phone</label>
					<input id="phone" name="phone" type="tel" required />

					<label htmlFor="email">Email</label>
					<input id="email" name="email" type="email" required />

					<label htmlFor="address">Where it goes</label>
					<input id="address" name="address" type="text" />

					<label htmlFor="locale">Language</label>
					<select id="locale" name="locale" defaultValue="en">
						<option value="en">English</option>
						<option value="rw">Kinyarwanda</option>
					</select>

					{/*
					 * **The email always fires either way** *(R11)*. This decides whether
					 * the hand-sent WhatsApp draft is a required row in Today or an
					 * optional one beside it.
					 */}
					<label htmlFor="preferredChannel">How they want to hear</label>
					<select id="preferredChannel" name="preferredChannel" defaultValue="email">
						<option value="email">email</option>
						<option value="whatsapp">WhatsApp</option>
					</select>

					<label htmlFor="kind">Kind</label>
					<select id="kind" name="kind" defaultValue="collection">
						<option value="collection">a piece from the collection</option>
						<option value="commission">only yours</option>
					</select>

					<label htmlFor="new-pieceId">The piece</label>
					<select id="new-pieceId" name="pieceId" defaultValue="">
						<option value="">none yet — a commission</option>
						{pieces.map((piece) => (
							<option key={piece.id} value={piece.id}>
								{piece.name}
							</option>
						))}
						{commissionPieces.map((piece) => (
							<option key={piece.id} value={piece.id}>
								{piece.name} (only yours)
							</option>
						))}
					</select>

					<label htmlFor="brief">Their scene, in their words</label>
					<textarea id="brief" name="brief" rows={4} />

					<button type="submit">Create the order</button>
				</form>
			</details>
		</main>
	);
}
