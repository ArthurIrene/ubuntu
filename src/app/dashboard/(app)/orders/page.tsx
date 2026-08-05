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

			{/*
			 * **One pipeline, filtered** *(R6)* — and the filter is in the URL, so it
			 * survives a bookmark and a link he sends himself. Which one is on is
			 * carried by `aria-current`, the same way the four sections are.
			 */}
			<p className="filters">
				<Link href="/dashboard/orders" aria-current={filter === null ? "page" : undefined}>
					All
				</Link>
				<Link
					href="/dashboard/orders?kind=collection"
					aria-current={filter === "collection" ? "page" : undefined}
				>
					Collection
				</Link>
				<Link
					href="/dashboard/orders?kind=commission"
					aria-current={filter === "commission" ? "page" : undefined}
				>
					Only yours
				</Link>
			</p>

			{/* **A number he reads, not a threshold that fires** *(R9c)*. */}
			<p className="meta mb-4 px-1">
				{adjusted?.count ?? 0} price{(adjusted?.count ?? 0) === 1 ? "" : "s"} adjusted in the last{" "}
				{RECENT_DAYS} days.
			</p>

			<div className="panel">
				<ul className="rows">
					{rows.map((row) => (
						<li key={row.id} className="stacked">
							<Link href={`/dashboard/orders/${row.id}`} className="link font-medium">
								{row.customerName ?? "A redacted customer"} — {row.pieceName ?? "a commission"}
							</Link>
							<p className="meta mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1">
								<span className="tag">{label(row.id, row.kind)}</span>
								{row.confirmedTotal !== null && (
									<>
										<span className="money">
											{formatMoney({ value: row.confirmedTotal, currency: row.currency })}
										</span>
										<span aria-hidden="true">·</span>
									</>
								)}
								{row.createdAt.toISOString().slice(0, 10)}
							</p>
						</li>
					))}
					{rows.length === 0 && <li>None yet.</li>}
				</ul>
			</div>

			{/*
			 * Entering one by hand. No document specified this, and it is here for a
			 * named reason: the public order form is Phase 4, and R7 already has him
			 * entering fit numbers himself when they arrived over WhatsApp. It
			 * creates exactly what the public form will create.
			 */}
			<details>
				<summary>Take an order yourself</summary>
				<form action={createOrder} className="fields">
					<div>
						<label htmlFor="name">Name</label>
						<input id="name" name="name" type="text" required />
					</div>

					{/* **Email and phone are both required** *(R5)*. */}
					<div className="fields-row">
						<div>
							<label htmlFor="phone">Phone</label>
							<input id="phone" name="phone" type="tel" required />
						</div>

						<div>
							<label htmlFor="email">Email</label>
							<input id="email" name="email" type="email" required />
						</div>
					</div>

					<div>
						<label htmlFor="address">Where it goes</label>
						<input id="address" name="address" type="text" />
					</div>

					<div className="fields-row">
						<div>
							<label htmlFor="locale">Language</label>
							<select id="locale" name="locale" defaultValue="en">
								<option value="en">English</option>
								<option value="rw">Kinyarwanda</option>
							</select>
						</div>

						{/*
						 * **The email always fires either way** *(R11)*. This decides whether
						 * the hand-sent WhatsApp draft is a required row in Today or an
						 * optional one beside it.
						 */}
						<div>
							<label htmlFor="preferredChannel">How they want to hear</label>
							<select id="preferredChannel" name="preferredChannel" defaultValue="email">
								<option value="email">email</option>
								<option value="whatsapp">WhatsApp</option>
							</select>
						</div>
					</div>

					<div className="fields-row">
						<div>
							<label htmlFor="kind">Kind</label>
							<select id="kind" name="kind" defaultValue="collection">
								<option value="collection">a piece from the collection</option>
								<option value="commission">only yours</option>
							</select>
						</div>

						<div>
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
						</div>
					</div>

					<div>
						<label htmlFor="brief">Their scene, in their words</label>
						<textarea id="brief" name="brief" rows={4} />
					</div>

					<div className="form-actions">
						<button type="submit" className="btn-primary">
							Create the order
						</button>
					</div>
				</form>
			</details>
		</main>
	);
}
