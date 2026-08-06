import Link from "next/link";

import { formatMoney } from "@/emails/order";
import { requireSession } from "@/lib/auth";
import { today, type QueueRow } from "@/lib/queue";

import {
	confirmPayment,
	markComplete,
	markDelivered,
	markShipped,
	noteWhatsappSent,
	resendMessage,
} from "./actions";

/**
 * **Today — the work queue, and the home screen** *(R9a)*.
 *
 * Membership is gate-based: a row is here because the next move is his, and it
 * goes the moment he makes it. Nothing on this page is time-based, so there is
 * nothing to tune, and it can neither nag nor go quiet.
 *
 * **It is complete and it is never truncated.** No top five, no "show more", no
 * pagination. A queue that hides its tail is worse than no queue, because it
 * looks complete.
 */
export const dynamic = "force-dynamic";

export default async function Today() {
	await requireSession();
	const queue = await today();

	const total = queue.groups.reduce((count, group) => count + group.rows.length, 0);

	return (
		<main>
			<h1>Today</h1>

			{/*
			 * An empty queue is the good state, not an empty screen. It gets the
			 * panel every group gets, so *nothing waiting on you* reads as an answer
			 * rather than as a page that failed to load.
			 */}
			{total === 0 && (
				<div className="panel">
					<p>Nothing waiting on you.</p>
				</div>
			)}

			{queue.groups.map((group) => (
				<section key={group.key} className="panel">
					{/*
					 * Grouped by action, with a count per heading — *confirm a price ·
					 * 3*. The count is the thing that makes twelve items read as four
					 * decisions, so it is set as a mark rather than as more words.
					 */}
					<h2 className="flex items-center gap-2">
						{group.heading} <span className="tag tag-count">{group.rows.length}</span>
					</h2>
					<ul className="rows">
						{group.rows.map((row, index) => (
							<li
								key={`${row.orderId}-${row.action.key}-${row.action.emailKey ?? index}`}
								className="stacked"
							>
								<Row row={row} />
							</li>
						))}
					</ul>
				</section>
			))}

			{/*
			 * **One line at the foot, not mixed in among the rows** *(R9a)*. The
			 * gate-based rule cannot catch an order where the next move is theirs,
			 * and this is what feeds R4's Lapsed.
			 */}
			{queue.waitingOnCustomers > 0 && (
				<p className="meta mt-4 px-1">
					{queue.waitingOnCustomers} waiting on{" "}
					{queue.waitingOnCustomers === 1 ? "a customer" : "customers"}.
				</p>
			)}
		</main>
	);
}

/**
 * One row: who and what, then the state, then the move.
 *
 * Two lines rather than one sentence of middle dots. On a 360px screen the
 * customer and the piece are what he is looking for and they get the line; the
 * status, the money and the age are what he checks once he has found it.
 */
function Row({ row }: { row: QueueRow }) {
	return (
		<div className="w-full">
			<p className="font-medium">
				<strong>{row.customerName}</strong> — {row.pieceName}
			</p>

			<p className="meta mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1">
				<span className="tag">{row.statusLabel}</span>
				{row.amount ? <span className="money">{formatMoney(row.amount)}</span> : null}
				{/* Its own item, so the gap lands on both sides of it. A separator
				    inside a flex line has its whitespace collapsed away. */}
				{row.amount ? <span aria-hidden="true">·</span> : null}
				{/*
				 * **Days-waiting is information only** *(R9a)*. It never adds a row
				 * and never removes one; the date was the part that had to be
				 * visible, and the age is not the rule — so it is set as quietly as
				 * everything else here and is never coloured by how large it is.
				 */}
				{row.days === 0 ? "today" : `${row.days} ${row.days === 1 ? "day" : "days"}`}
			</p>

			<div className="mt-3 flex flex-wrap items-center gap-2">
				<Action row={row} />

				{/*
				 * **Every emailing row also offers the one-tap WhatsApp version**
				 * *(R11)* — pre-written, same wording, same link, the customer's
				 * locale. Optional here; the `send_whatsapp` group is where it is
				 * required and will not clear until he has sent it.
				 *
				 * The token is inside this href and nowhere on the screen: R12d's one
				 * permitted exception, one token per deliberate action rather than a
				 * table.
				 */}
				{row.whatsapp && row.action.key !== "send_whatsapp" && (
					<a href={row.whatsapp} target="_blank" rel="noreferrer" className="button btn-small">
						Send it on WhatsApp
					</a>
				)}
			</div>
		</div>
	);
}

/**
 * The control the row carries.
 *
 * **Facts complete inline; judgements open the order** *(R9a)*. The difference
 * is not cosmetic: a judgement snapshots a breakdown and sends a number that
 * cannot be taken back, so it does not get a button on a list.
 *
 * The styling carries that difference rather than flattening it. A fact is a
 * filled button — one tap, the row goes, the email fires. A judgement is an
 * outlined link, because pressing it does not send anything: it takes him to the
 * screen where he decides. **Neither is ever a row of them with one control at
 * the top; there is no bulk action here and no styling for one.**
 */
function Action({ row }: { row: QueueRow }) {
	const order = <input type="hidden" name="orderId" value={row.orderId} />;

	switch (row.action.key) {
		case "confirm_price":
		case "share_design":
		case "start_making":
			return (
				<Link href={`/dashboard/orders/${row.orderId}`} className="button">
					{row.action.key === "confirm_price"
						? "Open the order to confirm the price"
						: row.action.key === "share_design"
							? "Open the order to share the design"
							: "Open the order to start the making"}
				</Link>
			);

		case "confirm_payment":
			return (
				<form action={confirmPayment}>
					{order}
					<input type="hidden" name="paymentId" value={row.action.paymentId ?? ""} />
					<button type="submit" className="btn-primary">
						The money landed
					</button>
				</form>
			);

		case "mark_complete":
			return (
				<form action={markComplete}>
					{order}
					<button type="submit" className="btn-primary">
						Finished stitching
					</button>
				</form>
			);

		case "mark_shipped":
			return (
				// On its way is one of the four that carry his personal note *(R9d)*.
				// Optional, and leaving it empty is still one tap.
				<form action={markShipped} className="w-full max-w-md">
					{order}
					<label htmlFor={`note-${row.orderId}`}>A note, if you want one</label>
					<input id={`note-${row.orderId}`} name="note" type="text" />
					<div className="form-actions">
						<button type="submit" className="btn-primary">
							Posted it
						</button>
					</div>
				</form>
			);

		case "mark_delivered":
			return (
				<form action={markDelivered}>
					{order}
					<button type="submit" className="btn-primary">
						It arrived
					</button>
				</form>
			);

		case "send_whatsapp":
			return (
				<>
					{/*
					 * The draft leads and the acknowledgement follows it, in that order:
					 * this row does not clear until he has actually sent it, and marking
					 * it sent before opening it is the one mistake the pair can make.
					 */}
					{row.whatsapp && (
						<a
							href={row.whatsapp}
							target="_blank"
							rel="noreferrer"
							className="button btn-primary"
						>
							Open the WhatsApp draft
						</a>
					)}
					<form action={noteWhatsappSent}>
						{order}
						<input type="hidden" name="emailKey" value={row.action.emailKey ?? ""} />
						<button type="submit">Sent it</button>
					</form>
				</>
			);

		case "resend_failed":
			return (
				<form action={resendMessage}>
					{order}
					<input type="hidden" name="emailKey" value={row.action.emailKey ?? ""} />
					<button type="submit" className="btn-primary">
						Send it again
					</button>
				</form>
			);
	}
}
