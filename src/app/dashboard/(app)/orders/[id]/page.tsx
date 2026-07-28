import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";

import PhotoUpload from "@/components/photo-upload";
import { fromCanonical, isMeasurementKey, MEASUREMENTS } from "@/content/measurements";
import { getDb, schema } from "@/db/client";
import { formatMoney } from "@/emails/order";
import { requireSession } from "@/lib/auth";
import {
	ACTION_HEADING,
	gates,
	netPaid,
	openGate,
	queueActions,
	status,
	STATUS_LABEL,
	type OrderFacts,
} from "@/lib/order-state";

import {
	agreeDesign,
	cancel,
	checkFit,
	confirmPrice,
	decline,
	lapse,
	recordFit,
	recordPayment,
	resendToken,
	rotateToken,
	setMaker,
	shareDesign,
	startMaking,
} from "../actions";

export const dynamic = "force-dynamic";

/**
 * The order screen. **Panels, not a timeline** *(R9c)*.
 *
 * Customer, money, fit, photos, maker — each its own block, with the event log
 * as one panel among them, collapsed. The queue sends him here with one
 * specific job, and a timeline would make him read three weeks of history to
 * find the button. Panels also stack on a phone, where he will actually be.
 *
 * *The cost, named: when an order goes wrong the timeline is the view you want,
 * and it is a click away rather than in front of him.*
 *
 * **No token appears anywhere on this page** *(R12d)* — no field, no list, no
 * link to `/o/<token>`. The panels are why he never needs it. The one exception
 * is the WhatsApp draft, which lives on Today.
 */
export default async function OrderScreen({
	params,
	searchParams,
}: {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ e?: string }>;
}) {
	await requireSession();
	const { id } = await params;
	const { e } = await searchParams;
	const db = await getDb();

	const [order] = await db
		.select({
			id: schema.orders.id,
			kind: schema.orders.kind,
			locale: schema.orders.locale,
			preferredChannel: schema.orders.preferredChannel,
			currency: schema.orders.currency,
			confirmedTotal: schema.orders.confirmedTotal,
			confirmedAt: schema.orders.confirmedAt,
			brief: schema.orders.brief,
			createdAt: schema.orders.createdAt,
			makerId: schema.orders.makerId,
			customerId: schema.customers.id,
			customerName: schema.customers.name,
			customerPhone: schema.customers.phone,
			customerEmail: schema.customers.email,
			customerAddress: schema.customers.address,
			redactedAt: schema.customers.redactedAt,
			pieceId: schema.pieces.id,
			pieceName: schema.pieces.name,
			pieceBasePrice: schema.pieces.basePrice,
			pieceGarmentTypeId: schema.pieces.garmentTypeId,
		})
		.from(schema.orders)
		.innerJoin(schema.customers, eq(schema.customers.id, schema.orders.customerId))
		.leftJoin(schema.pieces, eq(schema.pieces.id, schema.orders.pieceId))
		.where(eq(schema.orders.id, id))
		.limit(1);

	if (!order) notFound();

	const [events, payments, schedule, priceLines, fitRecords, images, makers, garmentTypes, commissionPieces] =
		await Promise.all([
			db
				.select()
				.from(schema.orderEvents)
				.where(eq(schema.orderEvents.orderId, id))
				.orderBy(desc(schema.orderEvents.at)),
			db
				.select()
				.from(schema.payments)
				.where(eq(schema.payments.orderId, id))
				.orderBy(asc(schema.payments.createdAt)),
			db
				.select()
				.from(schema.orderPaymentSchedule)
				.where(eq(schema.orderPaymentSchedule.orderId, id))
				.orderBy(asc(schema.orderPaymentSchedule.position)),
			db
				.select()
				.from(schema.orderPriceLines)
				.where(eq(schema.orderPriceLines.orderId, id))
				.orderBy(asc(schema.orderPriceLines.position)),
			db
				.select()
				.from(schema.fitRecords)
				.where(eq(schema.fitRecords.orderId, id))
				.orderBy(desc(schema.fitRecords.createdAt)),
			db
				.select()
				.from(schema.orderImages)
				.where(eq(schema.orderImages.orderId, id))
				.orderBy(asc(schema.orderImages.position)),
			db.select().from(schema.makers).where(eq(schema.makers.active, true)).orderBy(asc(schema.makers.position)),
			db.select().from(schema.garmentTypes).orderBy(asc(schema.garmentTypes.position)),
			db
				.select({ id: schema.pieces.id, name: schema.pieces.name })
				.from(schema.pieces)
				.where(eq(schema.pieces.kind, "commission"))
				.orderBy(desc(schema.pieces.createdAt)),
		]);

	const latestFit = fitRecords[0] ?? null;

	const facts: OrderFacts = {
		kind: order.kind,
		preferredChannel: order.preferredChannel,
		events: events.map((event) => ({ type: event.type, at: event.at, note: event.note })),
		payments: payments.map((payment) => ({
			id: payment.id,
			amount: payment.amount,
			type: payment.type,
			gate: payment.gate,
			reported: payment.reported,
			confirmedAt: payment.confirmedAt,
			createdAt: payment.createdAt,
		})),
		schedule: schedule.map((row) => ({
			gate: row.gate,
			amount: row.amount,
			position: row.position,
		})),
		hasFitRecord: latestFit !== null,
		fitChecked: latestFit?.checkedAt != null,
	};

	const now = status(facts);
	const actions = queueActions(facts);
	const measurements = latestFit
		? await db
				.select()
				.from(schema.fitMeasurements)
				.where(eq(schema.fitMeasurements.fitRecordId, latestFit.id))
				.orderBy(asc(schema.fitMeasurements.position))
		: [];

	const garmentTypeId = order.pieceGarmentTypeId ?? garmentTypes[0]?.id ?? "";
	const typeMeasurements = garmentTypeId
		? await db
				.select()
				.from(schema.garmentTypeMeasurements)
				.where(eq(schema.garmentTypeMeasurements.garmentTypeId, garmentTypeId))
				.orderBy(asc(schema.garmentTypeMeasurements.position))
		: [];

	const cash = (value: number | null) =>
		value === null ? "—" : formatMoney({ value, currency: order.currency });

	return (
		<main>
			<p>
				<Link href="/dashboard/orders">Orders</Link>
			</p>

			<h1>
				{order.customerName ?? "A redacted customer"} — {order.pieceName ?? "a commission"}
			</h1>
			<p>
				{STATUS_LABEL[now]} · {order.kind} · {order.locale} ·{" "}
				{order.preferredChannel === "whatsapp" ? "prefers WhatsApp" : "prefers email"}
			</p>

			{e === "fit" && (
				<p role="alert">
					The fit has not been checked. That check is required before <em>In the making</em>, and
					it is required on every order.
				</p>
			)}
			{e === "reason" && <p role="alert">A price adjustment needs a reason.</p>}
			{e === "amount" && <p role="alert">A payment needs an amount.</p>}

			{/*
			 * **The action the queue sent him for sits at the top** *(R9c)*. He
			 * arrived here with one job; it should not be below the fold under three
			 * weeks of panels.
			 */}
			{actions.length > 0 && (
				<section>
					<h2>Waiting on you</h2>
					<ul>
						{actions.map((action, index) => (
							<li key={index}>{ACTION_HEADING[action.key]}</li>
						))}
					</ul>
				</section>
			)}

			{/* ── Money ─────────────────────────────────────────────────────── */}
			<section>
				<h2>Money</h2>

				{order.confirmedAt ? (
					<>
						<p>Confirmed {order.confirmedAt.toISOString().slice(0, 10)}</p>
						<table>
							<tbody>
								{priceLines.map((line) => (
									<tr key={line.id}>
										<td>{line.label}</td>
										<td>{cash(line.amount)}</td>
									</tr>
								))}
								<tr>
									<td>
										<strong>Total</strong>
									</td>
									<td>
										<strong>{cash(order.confirmedTotal)}</strong>
									</td>
								</tr>
							</tbody>
						</table>
					</>
				) : (
					/*
					 * **Price is adjustable at confirmation, reason required** *(R9c)*,
					 * written as its own named line in the snapshot rather than a
					 * silently different base. That is what answers *why 51,000?*
					 */
					<form action={confirmPrice}>
						<input type="hidden" name="orderId" value={order.id} />
						<label htmlFor="base">The piece</label>
						<input
							id="base"
							name="base"
							type="number"
							defaultValue={order.pieceBasePrice ?? undefined}
							required
						/>

						<label htmlFor="adjustment">Adjustment, if any</label>
						<input id="adjustment" name="adjustment" type="number" />

						<label htmlFor="reason">Why — required on any adjustment</label>
						<input id="reason" name="reason" type="text" />

						{order.kind === "commission" && (
							<>
								<label htmlFor="designFee">Design fee</label>
								<input id="designFee" name="designFee" type="number" />
							</>
						)}

						{/* One of the four that carry his personal note *(R9d)*. */}
						<label htmlFor="note">A note to them, if you want one</label>
						<textarea id="note" name="note" rows={3} />

						<button type="submit">Confirm the price</button>
					</form>
				)}

				<h3>The gates</h3>
				<ul>
					{gates(facts).map((entry, index) => (
						<li key={index}>
							{entry.gate ?? "the piece"} — {cash(entry.amount)} · paid{" "}
							{cash(netPaid(facts, entry.gate))}
						</li>
					))}
				</ul>
				<p>
					Net received {cash(netPaid(facts))}
					{openGate(facts) ? ` · ${openGate(facts)?.gate ?? "the piece"} still open` : ""}
				</p>

				<h3>Payments</h3>
				<ul>
					{payments.map((payment) => (
						<li key={payment.id}>
							{cash(payment.amount)} · {payment.type} · {payment.method} ·{" "}
							{payment.gate ?? "the piece"} ·{" "}
							{payment.confirmedAt
								? `confirmed ${payment.confirmedAt.toISOString().slice(0, 10)}`
								: payment.reported
									? "reported by them, not yet confirmed"
									: "unconfirmed"}
						</li>
					))}
					{payments.length === 0 && <li>Nothing yet.</li>}
				</ul>

				<form action={recordPayment}>
					<input type="hidden" name="orderId" value={order.id} />
					<label htmlFor="amount">Record a payment</label>
					<input id="amount" name="amount" type="number" required />
					<label htmlFor="gate">Against</label>
					<select id="gate" name="gate" defaultValue="">
						<option value="">the piece</option>
						<option value="design_fee">design fee</option>
						<option value="cutting">cutting</option>
						<option value="balance">balance</option>
					</select>
					<label htmlFor="reference">Reference</label>
					<input id="reference" name="reference" type="text" />
					<button type="submit">Record it</button>
				</form>
			</section>

			{/* ── The design, on a commission ───────────────────────────────── */}
			{order.kind === "commission" && (
				<section>
					<h2>The design</h2>
					{order.brief && (
						<blockquote>
							{/* Their own words, shown back to them during the design window. */}
							{order.brief}
						</blockquote>
					)}

					<form action={shareDesign}>
						<input type="hidden" name="orderId" value={order.id} />
						<label htmlFor="design-note">A note with the design</label>
						<textarea id="design-note" name="note" rows={3} />
						<button type="submit">Share the design</button>
					</form>

					{/*
					 * **The piece is minted at design agreement** *(R6)*, which is when
					 * making days become knowable and it enters the queue.
					 */}
					<form action={agreeDesign}>
						<input type="hidden" name="orderId" value={order.id} />
						<label htmlFor="pieceId">The piece this became</label>
						<select id="pieceId" name="pieceId" defaultValue={order.pieceId ?? ""}>
							<option value="">not yet</option>
							{commissionPieces.map((piece) => (
								<option key={piece.id} value={piece.id}>
									{piece.name}
								</option>
							))}
						</select>
						<label htmlFor="cutting">To start the cutting</label>
						<input id="cutting" name="cutting" type="number" />
						<label htmlFor="balance">Balance on completion</label>
						<input id="balance" name="balance" type="number" />
						<button type="submit">The design is agreed</button>
					</form>
				</section>
			)}

			{/* ── Fit ───────────────────────────────────────────────────────── */}
			<section>
				<h2>Fit</h2>

				{latestFit ? (
					<>
						<p>
							{latestFit.source} · {latestFit.unit} · chart {latestFit.sizeChartVersion}
							{latestFit.standardSize ? ` · size ${latestFit.standardSize}` : ""}
							{latestFit.ageYears !== null ? ` · age ${latestFit.ageYears}` : ""}
							{" · taken "}
							{latestFit.createdAt.toISOString().slice(0, 10)}
						</p>

						{latestFit.redactedAt ? (
							<p>
								These numbers were erased with the customer. The order still resolves; the fit
								record can no longer settle a dispute, which is correct.
							</p>
						) : (
							<ul>
								{measurements.map((row) => (
									<li key={row.id}>
										{row.label}:{" "}
										{row.value === null
											? "—"
											: isMeasurementKey(row.measurementKey)
												? `${fromCanonical(row.value, latestFit.unit, row.measurementKey)} ${
														MEASUREMENTS[row.measurementKey].unit === "g"
															? "kg"
															: latestFit.unit
													}`
												: row.value}
										{row.warned && " · outside the usual band"}
										{row.acknowledgedAt && " · acknowledged"}
									</li>
								))}
							</ul>
						)}

						{/*
						 * **Unconditional** *(R9c)*. Not raised only on odd numbers: the
						 * case a conditional tick would not raise is the
						 * plausible-but-wrong number that sails through, and cloth is cut
						 * at the second gate.
						 */}
						{latestFit.checkedAt ? (
							<p>Fit checked {latestFit.checkedAt.toISOString().slice(0, 10)}.</p>
						) : (
							<form action={checkFit}>
								<input type="hidden" name="orderId" value={order.id} />
								<input type="hidden" name="fitRecordId" value={latestFit.id} />
								<button type="submit">I have checked these numbers</button>
							</form>
						)}
					</>
				) : (
					<p>No numbers yet.</p>
				)}

				<details>
					<summary>Enter a set of numbers</summary>
					{/* Appends a new record; it never overwrites the last one *(R7)*. */}
					<form action={recordFit}>
						<input type="hidden" name="orderId" value={order.id} />

						<label htmlFor="garmentTypeId">Garment type</label>
						<select id="garmentTypeId" name="garmentTypeId" defaultValue={garmentTypeId}>
							{garmentTypes.map((type) => (
								<option key={type.id} value={type.id}>
									{type.name}
								</option>
							))}
						</select>

						<label htmlFor="source">Who measured</label>
						<select id="source" name="source" defaultValue="self">
							<option value="self">they measured themselves</option>
							<option value="guardian">they measured someone else</option>
							<option value="tailor">a tailor measured them</option>
							<option value="standard">they chose a size</option>
							<option value="ours">we measured them</option>
						</select>

						<label htmlFor="unit">Unit</label>
						<select id="unit" name="unit" defaultValue="cm">
							<option value="cm">cm</option>
							<option value="in">in</option>
						</select>

						<label htmlFor="standardSize">Size, if they chose one</label>
						<input id="standardSize" name="standardSize" type="text" />

						{/* Age as a number, never a date of birth *(R13a)*. */}
						<label htmlFor="ageYears">Age at order, in years — kids only</label>
						<input id="ageYears" name="ageYears" type="number" min={0} max={17} />

						{typeMeasurements.length === 0 && (
							<p>
								This garment type has no measurement list yet. Settings is where it is set.
							</p>
						)}

						{typeMeasurements.map((measurement) =>
							isMeasurementKey(measurement.measurementKey) ? (
								<p key={measurement.id}>
									<label htmlFor={`m_${measurement.measurementKey}`}>
										{MEASUREMENTS[measurement.measurementKey].label}
									</label>
									{/* The instruction ships beside the field, never in a tooltip. */}
									<small>{MEASUREMENTS[measurement.measurementKey].instruction}</small>
									<input
										id={`m_${measurement.measurementKey}`}
										name={`m_${measurement.measurementKey}`}
										type="number"
										step="0.1"
									/>
									<label>
										<input type="checkbox" name={`ack_${measurement.measurementKey}`} />
										They confirmed an unusual number
									</label>
								</p>
							) : null,
						)}

						<button type="submit">Record these numbers</button>
					</form>
				</details>
			</section>

			{/* ── The making ────────────────────────────────────────────────── */}
			<section>
				<h2>The making</h2>
				<form action={startMaking}>
					<input type="hidden" name="orderId" value={order.id} />
					<button type="submit">Start the making</button>
				</form>
				<p>
					The fit check is required first, and it is required on every order. Cloth is cut at the
					second gate, so a wrong measurement found after it is unrecoverable.
				</p>
			</section>

			{/* ── Photos ────────────────────────────────────────────────────── */}
			<section>
				<h2>Photos</h2>
				{/*
				 * **Progress photos get one derivative at 1000 px** *(R8)* — private,
				 * behind the token, where posting speed matters more than polish.
				 * Resized on his device before they are sent, like everything else.
				 */}
				<PhotoUpload target={{ kind: "progress", orderId: order.id }} />
				<ul>
					{images.map((image) => (
						<li key={image.id}>
							{image.kind} · {image.width}×{image.height} ·{" "}
							{image.createdAt.toISOString().slice(0, 10)}
						</li>
					))}
					{images.length === 0 && <li>None yet.</li>}
				</ul>
				<p>
					These are private. They are streamed through the Worker with the order token checked,
					never served from the public bucket.
				</p>
			</section>

			{/* ── Maker ─────────────────────────────────────────────────────── */}
			<section>
				<h2>Maker</h2>
				<form action={setMaker}>
					<input type="hidden" name="orderId" value={order.id} />
					<select name="makerId" defaultValue={order.makerId ?? ""}>
						<option value="">not chosen</option>
						{makers.map((maker) => (
							<option key={maker.id} value={maker.id}>
								{maker.name}
							</option>
						))}
					</select>
					<button type="submit">Save</button>
				</form>
			</section>

			{/* ── Customer ──────────────────────────────────────────────────── */}
			<section>
				<h2>Customer</h2>
				{order.redactedAt ? (
					<p>This customer asked to be forgotten. The order survives; they do not.</p>
				) : (
					<ul>
						<li>{order.customerName}</li>
						<li>{order.customerPhone}</li>
						<li>{order.customerEmail}</li>
						{order.customerAddress && <li>{order.customerAddress}</li>}
					</ul>
				)}

				{/*
				 * **No token is rendered here** *(R12d)* — these two send it, they do
				 * not show it. Rotation stays one order at a time; the bulk version
				 * does not exist and its absence is the control.
				 */}
				<form action={resendToken}>
					<input type="hidden" name="orderId" value={order.id} />
					<button type="submit">Send them their link again</button>
				</form>
				<form action={rotateToken}>
					<input type="hidden" name="orderId" value={order.id} />
					<button type="submit">Rotate the link and send the new one</button>
				</form>
			</section>

			{/* ── Endings ───────────────────────────────────────────────────── */}
			<section>
				<h2>Endings</h2>
				<form action={decline}>
					<input type="hidden" name="orderId" value={order.id} />
					<label htmlFor="decline-note">Why, in your words</label>
					<textarea id="decline-note" name="note" rows={3} />
					<button type="submit">Decline it</button>
				</form>
				<form action={lapse}>
					<input type="hidden" name="orderId" value={order.id} />
					<button type="submit">Mark it lapsed</button>
				</form>
				<form action={cancel}>
					<input type="hidden" name="orderId" value={order.id} />
					<button type="submit">Cancel it</button>
				</form>
			</section>

			{/* ── The log ───────────────────────────────────────────────────── */}
			<section>
				{/* **One panel among them, collapsed by default** *(R9c)*. */}
				<details>
					<summary>Everything that happened ({events.length})</summary>
					<ol>
						{events.map((event) => (
							<li key={event.id}>
								{event.at.toISOString().slice(0, 16).replace("T", " ")} · {event.type} ·{" "}
								{event.actor}
								{event.note ? ` · ${event.note}` : ""}
							</li>
						))}
					</ol>
				</details>
			</section>
		</main>
	);
}
