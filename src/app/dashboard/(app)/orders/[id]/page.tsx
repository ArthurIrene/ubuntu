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
			<Link href="/dashboard/orders" className="breadcrumb">
				Orders
			</Link>

			<h1>
				{order.customerName ?? "A redacted customer"} — {order.pieceName ?? "a commission"}
			</h1>

			{/*
			 * What this order *is*, in four marks: where it has got to, which kind it
			 * is, which language every email will be written in, and which channel he
			 * owes them. The status leads because it is the one that changes.
			 */}
			<p className="mb-4 flex flex-wrap items-center gap-1.5">
				<span className="tag tag-live">{STATUS_LABEL[now]}</span>
				<span className="tag">{order.kind}</span>
				<span className="tag">{order.locale}</span>
				<span className="tag">
					{order.preferredChannel === "whatsapp" ? "prefers WhatsApp" : "prefers email"}
				</span>
			</p>

			{e === "fit" && (
				<p role="alert">
					The fit has not been checked. That check is required before <em>In the making</em>, and
					it is required on every order.
				</p>
			)}
			{e === "reason" && <p role="alert">A price adjustment needs a reason.</p>}
			{e === "amount" && <p role="alert">A payment needs an amount.</p>}
			{e === "unpaid" && (
				<p role="alert">
					Nothing is cut before it is paid for. The balance is not part of that — it falls due on
					completion, before it ships.
				</p>
			)}

			{/*
			 * **The action the queue sent him for sits at the top** *(R9c)*. He
			 * arrived here with one job; it should not be below the fold under three
			 * weeks of panels.
			 */}
			{actions.length > 0 && (
				<section className="panel panel-lead">
					<h2>Waiting on you</h2>
					<ul className="rows">
						{actions.map((action, index) => (
							<li key={index}>{ACTION_HEADING[action.key]}</li>
						))}
					</ul>
				</section>
			)}

			{/* ── Money ─────────────────────────────────────────────────────── */}
			<section className="panel">
				<h2>Money</h2>

				{order.confirmedAt ? (
					<>
						<p className="meta mb-2">Confirmed {order.confirmedAt.toISOString().slice(0, 10)}</p>
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
					<form action={confirmPrice} className="fields">
						<input type="hidden" name="orderId" value={order.id} />

						{/*
						 * What they chose, snapshotted when they asked. These lines are
						 * carried through confirmation untouched and added into the total
						 * — he is confirming the base, not re-entering their order. Set on
						 * the desk rather than as fields, because they are not his to
						 * change here.
						 */}
						{priceLines.filter((line) => line.kind !== "base").length > 0 && (
							<ul className="inset">
								{priceLines
									.filter((line) => line.kind !== "base")
									.map((line) => (
										<li key={line.id} className="meta">
											{line.label} · <span className="money">{cash(line.amount)}</span>
										</li>
									))}
							</ul>
						)}

						<div className="fields-row">
							<div>
								<label htmlFor="base">The piece</label>
								<input
									id="base"
									name="base"
									type="number"
									defaultValue={order.pieceBasePrice ?? undefined}
									required
								/>
							</div>

							<div>
								<label htmlFor="adjustment">Adjustment, if any</label>
								<input id="adjustment" name="adjustment" type="number" />
							</div>
						</div>

						{/*
						 * **Reason required on any adjustment** *(R9c)*, written as its own
						 * named line in the snapshot. It sits at full width directly under
						 * the number it explains, because that is the pairing.
						 */}
						<div>
							<label htmlFor="reason">Why — required on any adjustment</label>
							<input id="reason" name="reason" type="text" />
						</div>

						{order.kind === "commission" && (
							<div>
								<label htmlFor="designFee">Design fee</label>
								<input id="designFee" name="designFee" type="number" />
							</div>
						)}

						{/* One of the four that carry his personal note *(R9d)*. */}
						<div>
							<label htmlFor="note">A note to them, if you want one</label>
							<textarea id="note" name="note" rows={3} />
						</div>

						<div className="form-actions">
							<button type="submit" className="btn-primary">
								Confirm the price
							</button>
						</div>
					</form>
				)}

				<h3 className="mt-6">The gates</h3>
				<ul className="rows">
					{gates(facts).map((entry, index) => (
						<li key={index}>
							<span>{entry.gate ?? "the piece"}</span>
							<span className="row-end money">
								{cash(entry.amount)} · paid {cash(netPaid(facts, entry.gate))}
							</span>
						</li>
					))}
				</ul>
				<p className="meta mt-2">
					Net received {cash(netPaid(facts))}
					{openGate(facts) ? ` · ${openGate(facts)?.gate ?? "the piece"} still open` : ""}
				</p>

				<h3 className="mt-6">Payments</h3>
				<ul className="rows">
					{payments.map((payment) => (
						<li key={payment.id}>
							<span className="money font-medium">{cash(payment.amount)}</span>
							<span className="meta">
								{payment.type} · {payment.method} · {payment.gate ?? "the piece"}
							</span>
							{/*
							 * **A customer-reported payment is a payment row awaiting his
							 * confirmation, never an order state** *(R5)*. Which of the three
							 * it is, as a mark, because this is the fact the money panel is
							 * read for.
							 */}
							<span className="tag row-end">
								{payment.confirmedAt
									? `confirmed ${payment.confirmedAt.toISOString().slice(0, 10)}`
									: payment.reported
										? "reported by them, not yet confirmed"
										: "unconfirmed"}
							</span>
						</li>
					))}
					{payments.length === 0 && <li className="meta">Nothing yet.</li>}
				</ul>

				<form action={recordPayment} className="fields mt-5">
					<input type="hidden" name="orderId" value={order.id} />
					<div className="fields-row" style={{ "--cols": 3 } as React.CSSProperties}>
						<div>
							<label htmlFor="amount">Record a payment</label>
							<input id="amount" name="amount" type="number" required />
						</div>
						<div>
							<label htmlFor="gate">Against</label>
							<select id="gate" name="gate" defaultValue="">
								<option value="">the piece</option>
								<option value="design_fee">design fee</option>
								<option value="cutting">cutting</option>
								<option value="balance">balance</option>
							</select>
						</div>
						<div>
							<label htmlFor="reference">Reference</label>
							<input id="reference" name="reference" type="text" />
						</div>
					</div>
					<div className="form-actions">
						<button type="submit" className="btn-primary">
							Record it
						</button>
					</div>
				</form>
			</section>

			{/* ── The design, on a commission ───────────────────────────────── */}
			{order.kind === "commission" && (
				<section className="panel">
					<h2>The design</h2>
					{order.brief && (
						<blockquote className="inset mb-4">
							{/* Their own words, shown back to them during the design window. */}
							{order.brief}
						</blockquote>
					)}

					<form action={shareDesign} className="fields">
						<input type="hidden" name="orderId" value={order.id} />
						<div>
							<label htmlFor="design-note">A note with the design</label>
							<textarea id="design-note" name="note" rows={3} />
						</div>
						<div className="form-actions">
							<button type="submit" className="btn-primary">
								Share the design
							</button>
						</div>
					</form>

					{/*
					 * **The piece is minted at design agreement** *(R6)*, which is when
					 * making days become knowable and it enters the queue.
					 */}
					<form action={agreeDesign} className="fields mt-6 border-t border-(--canvas-edge) pt-5">
						<input type="hidden" name="orderId" value={order.id} />
						<div>
							<label htmlFor="pieceId">The piece this became</label>
							<select id="pieceId" name="pieceId" defaultValue={order.pieceId ?? ""}>
								<option value="">not yet</option>
								{commissionPieces.map((piece) => (
									<option key={piece.id} value={piece.id}>
										{piece.name}
									</option>
								))}
							</select>
						</div>
						<div className="fields-row">
							<div>
								<label htmlFor="cutting">To start the cutting</label>
								<input id="cutting" name="cutting" type="number" />
							</div>
							<div>
								<label htmlFor="balance">Balance on completion</label>
								<input id="balance" name="balance" type="number" />
							</div>
						</div>
						<div className="form-actions">
							<button type="submit" className="btn-primary">
								The design is agreed
							</button>
						</div>
					</form>
				</section>
			)}

			{/* ── Fit ───────────────────────────────────────────────────────── */}
			<section className="panel">
				<h2>Fit</h2>

				{latestFit ? (
					<>
						<p className="meta mb-3">
							{latestFit.source} · {latestFit.unit} · chart {latestFit.sizeChartVersion}
							{latestFit.standardSize ? ` · size ${latestFit.standardSize}` : ""}
							{latestFit.ageYears !== null ? ` · age ${latestFit.ageYears}` : ""}
							{" · taken "}
							{latestFit.createdAt.toISOString().slice(0, 10)}
						</p>

						{latestFit.redactedAt ? (
							<p className="inset">
								These numbers were erased with the customer. The order still resolves; the fit
								record can no longer settle a dispute, which is correct.
							</p>
						) : (
							<ul className="rows">
								{measurements.map((row) => (
									<li key={row.id}>
										<span className="meta">{row.label}</span>
										<span className="money font-medium">
											{row.value === null
												? "—"
												: isMeasurementKey(row.measurementKey)
													? `${fromCanonical(row.value, latestFit.unit, row.measurementKey)} ${
															MEASUREMENTS[row.measurementKey].unit === "g"
																? "kg"
																: latestFit.unit
														}`
													: row.value}
										</span>
										{/*
										 * The soft guardrail's two facts, kept apart. **An
										 * unacknowledged warning and an acknowledged one are
										 * different facts in a dispute** *(R7)*, so they are two
										 * marks rather than one sentence.
										 */}
										{row.warned && <span className="tag row-end">outside the usual band</span>}
										{row.acknowledgedAt && (
											<span className={`tag${row.warned ? "" : " row-end"}`}>acknowledged</span>
										)}
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
							<p className="meta mt-3">
								Fit checked {latestFit.checkedAt.toISOString().slice(0, 10)}.
							</p>
						) : (
							<form action={checkFit} className="form-actions">
								<input type="hidden" name="orderId" value={order.id} />
								<input type="hidden" name="fitRecordId" value={latestFit.id} />
								<button type="submit" className="btn-primary">
									I have checked these numbers
								</button>
							</form>
						)}
					</>
				) : (
					<p className="meta">No numbers yet.</p>
				)}

				<details className="mt-4">
					<summary>Enter a set of numbers</summary>
					{/* Appends a new record; it never overwrites the last one *(R7)*. */}
					<form action={recordFit} className="fields">
						<input type="hidden" name="orderId" value={order.id} />

						<div>
							<label htmlFor="garmentTypeId">Garment type</label>
							<select id="garmentTypeId" name="garmentTypeId" defaultValue={garmentTypeId}>
								{garmentTypes.map((type) => (
									<option key={type.id} value={type.id}>
										{type.name}
									</option>
								))}
							</select>
						</div>

						{/* **This answer decides liability** *(R7, R13a)*, so it gets the
						    width rather than sharing a row. */}
						<div>
							<label htmlFor="source">Who measured</label>
							<select id="source" name="source" defaultValue="self">
								<option value="self">they measured themselves</option>
								<option value="guardian">they measured someone else</option>
								<option value="tailor">a tailor measured them</option>
								<option value="standard">they chose a size</option>
								<option value="ours">we measured them</option>
							</select>
						</div>

						<div className="fields-row" style={{ "--cols": 3 } as React.CSSProperties}>
							<div>
								<label htmlFor="unit">Unit</label>
								<select id="unit" name="unit" defaultValue="cm">
									<option value="cm">cm</option>
									<option value="in">in</option>
								</select>
							</div>

							<div>
								<label htmlFor="standardSize">Size, if they chose one</label>
								<input id="standardSize" name="standardSize" type="text" />
							</div>

							{/* Age as a number, never a date of birth *(R13a)*. */}
							<div>
								<label htmlFor="ageYears">Age at order, in years — kids only</label>
								<input id="ageYears" name="ageYears" type="number" min={0} max={17} />
							</div>
						</div>

						{typeMeasurements.length === 0 && (
							<p className="inset">
								This garment type has no measurement list yet. Settings is where it is set.
							</p>
						)}

						{typeMeasurements.map((measurement) =>
							isMeasurementKey(measurement.measurementKey) ? (
								<div key={measurement.id} className="inset">
									<label htmlFor={`m_${measurement.measurementKey}`}>
										{MEASUREMENTS[measurement.measurementKey].label}
									</label>
									{/* The instruction ships beside the field, never in a tooltip. */}
									<small className="mb-2">
										{MEASUREMENTS[measurement.measurementKey].instruction}
									</small>
									<input
										id={`m_${measurement.measurementKey}`}
										name={`m_${measurement.measurementKey}`}
										type="number"
										step="0.1"
										className="max-w-40"
									/>
									<label className="mt-2">
										<input type="checkbox" name={`ack_${measurement.measurementKey}`} />
										They confirmed an unusual number
									</label>
								</div>
							) : null,
						)}

						<div className="form-actions">
							<button type="submit" className="btn-primary">
								Record these numbers
							</button>
						</div>
					</form>
				</details>
			</section>

			{/* ── The making ────────────────────────────────────────────────── */}
			<section className="panel">
				<h2>The making</h2>
				{/*
				 * The sentence sits above the button rather than under it. It is the
				 * reason the button sometimes refuses, and a reason read afterwards is
				 * a reason nobody read.
				 */}
				<p className="meta mb-3">
					The fit check is required first, and it is required on every order. Cloth is cut at the
					second gate, so a wrong measurement found after it is unrecoverable.
				</p>
				<form action={startMaking}>
					<input type="hidden" name="orderId" value={order.id} />
					<button type="submit" className="btn-primary">
						Start the making
					</button>
				</form>
			</section>

			{/* ── Photos ────────────────────────────────────────────────────── */}
			<section className="panel">
				<h2>Photos</h2>
				{/*
				 * **Progress photos get one derivative at 1000 px** *(R8)* — private,
				 * behind the token, where posting speed matters more than polish.
				 * Resized on his device before they are sent, like everything else.
				 */}
				<PhotoUpload target={{ kind: "progress", orderId: order.id }} />
				<ul className="rows mt-3">
					{images.map((image) => (
						<li key={image.id}>
							<span>{image.kind}</span>
							<span className="meta row-end">
								{image.width}×{image.height} · {image.createdAt.toISOString().slice(0, 10)}
							</span>
						</li>
					))}
					{images.length === 0 && <li className="meta">None yet.</li>}
				</ul>
				<p className="meta mt-3">
					These are private. They are streamed through the Worker with the order token checked,
					never served from the public bucket.
				</p>
			</section>

			{/* ── Maker ─────────────────────────────────────────────────────── */}
			<section className="panel">
				<h2 id="maker-heading">Maker</h2>
				{/* **A table with an FK, not a typed string** *(R16)* — the story page
				    names and celebrates them, and a string backfills as misspellings.
				    The picker has no label of its own and is not given a new one: it is
				    pointed at the panel's heading, which already names it. */}
				<form action={setMaker} className="flex flex-wrap items-end gap-2">
					<input type="hidden" name="orderId" value={order.id} />
					<select
						name="makerId"
						defaultValue={order.makerId ?? ""}
						aria-labelledby="maker-heading"
						className="max-w-64"
					>
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
			<section className="panel">
				<h2>Customer</h2>
				{order.redactedAt ? (
					<p className="inset">
						This customer asked to be forgotten. The order survives; they do not.
					</p>
				) : (
					<ul className="rows">
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
				<div className="form-actions">
					<form action={resendToken}>
						<input type="hidden" name="orderId" value={order.id} />
						<button type="submit">Send them their link again</button>
					</form>
					<form action={rotateToken}>
						<input type="hidden" name="orderId" value={order.id} />
						<button type="submit">Rotate the link and send the new one</button>
					</form>
				</div>
			</section>

			{/* ── Endings ───────────────────────────────────────────────────── */}
			<section className="panel">
				<h2>Endings</h2>
				{/*
				 * Three ways an order stops, styled as endings: wine as an edge and
				 * wine as the word, never a red box. They sit at the foot of the screen
				 * because none of them is what he came here to do.
				 */}
				<form action={decline} className="fields">
					<input type="hidden" name="orderId" value={order.id} />
					<div>
						<label htmlFor="decline-note">Why, in your words</label>
						<textarea id="decline-note" name="note" rows={3} />
					</div>
					<div className="form-actions">
						<button type="submit" className="btn-ending">
							Decline it
						</button>
					</div>
				</form>

				<div className="form-actions">
					<form action={lapse}>
						<input type="hidden" name="orderId" value={order.id} />
						<button type="submit" className="btn-ending">
							Mark it lapsed
						</button>
					</form>
					<form action={cancel}>
						<input type="hidden" name="orderId" value={order.id} />
						<button type="submit" className="btn-ending">
							Cancel it
						</button>
					</form>
				</div>
			</section>

			{/* ── The log ───────────────────────────────────────────────────── */}
			{/* **One panel among them, collapsed by default** *(R9c)*. */}
			<details>
				<summary>Everything that happened ({events.length})</summary>
				<ol className="rows">
					{events.map((event) => (
						<li key={event.id} className="meta">
							{event.at.toISOString().slice(0, 16).replace("T", " ")} · {event.type} ·{" "}
							{event.actor}
							{event.note ? ` · ${event.note}` : ""}
						</li>
					))}
				</ol>
			</details>
		</main>
	);
}
