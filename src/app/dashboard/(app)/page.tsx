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

			{total === 0 && <p>Nothing waiting on you.</p>}

			{queue.groups.map((group) => (
				<section key={group.key}>
					{/* Grouped by action, with a count per heading — *confirm a price · 3*. */}
					<h2>
						{group.heading} · {group.rows.length}
					</h2>
					<ul>
						{group.rows.map((row, index) => (
							<li key={`${row.orderId}-${row.action.key}-${row.action.emailKey ?? index}`}>
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
				<p>
					{queue.waitingOnCustomers} waiting on{" "}
					{queue.waitingOnCustomers === 1 ? "a customer" : "customers"}.
				</p>
			)}
		</main>
	);
}

function Row({ row }: { row: QueueRow }) {
	return (
		<>
			<p>
				<strong>{row.customerName}</strong> — {row.pieceName} · {row.statusLabel}
				{row.amount ? ` · ${formatMoney(row.amount)}` : ""}
				{/*
				 * **Days-waiting is information only** *(R9a)*. It never adds a row
				 * and never removes one; the date was the part that had to be
				 * visible, and the age is not the rule.
				 */}
				{" · "}
				{row.days === 0 ? "today" : `${row.days} ${row.days === 1 ? "day" : "days"}`}
			</p>

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
				<a href={row.whatsapp} target="_blank" rel="noreferrer">
					Send it on WhatsApp
				</a>
			)}
		</>
	);
}

/**
 * The control the row carries.
 *
 * **Facts complete inline; judgements open the order** *(R9a)*. The difference
 * is not cosmetic: a judgement snapshots a breakdown and sends a number that
 * cannot be taken back, so it does not get a button on a list.
 */
function Action({ row }: { row: QueueRow }) {
	const order = <input type="hidden" name="orderId" value={row.orderId} />;

	switch (row.action.key) {
		case "confirm_price":
		case "share_design":
		case "start_making":
			return (
				<Link href={`/dashboard/orders/${row.orderId}`}>
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
					<button type="submit">The money landed</button>
				</form>
			);

		case "mark_complete":
			return (
				<form action={markComplete}>
					{order}
					<button type="submit">Finished stitching</button>
				</form>
			);

		case "mark_shipped":
			return (
				// On its way is one of the four that carry his personal note *(R9d)*.
				// Optional, and leaving it empty is still one tap.
				<form action={markShipped}>
					{order}
					<label htmlFor={`note-${row.orderId}`}>A note, if you want one</label>
					<input id={`note-${row.orderId}`} name="note" type="text" />
					<button type="submit">Posted it</button>
				</form>
			);

		case "mark_delivered":
			return (
				<form action={markDelivered}>
					{order}
					<button type="submit">It arrived</button>
				</form>
			);

		case "send_whatsapp":
			return (
				<>
					{row.whatsapp && (
						<a href={row.whatsapp} target="_blank" rel="noreferrer">
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
					<button type="submit">Send it again</button>
				</form>
			);
	}
}
