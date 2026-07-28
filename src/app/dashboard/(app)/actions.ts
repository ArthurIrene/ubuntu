"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb, schema } from "@/db/client";
import type { EmailKey } from "@/emails/order";
import { requireSession } from "@/lib/auth";
import { markWhatsappSent, sendOrderEmail } from "@/lib/notify";

// The Today queue's inline actions — **facts, completed where they stand**
// *(R9a)*. One tap, the row goes, the email fires. He is recording something
// that already happened.
//
// Judgements are not here. Confirming a price and sharing a design open the
// order screen, because each snapshots a breakdown and sends a number that
// cannot be taken back, and a one-tap approve on a price is exactly how a wrong
// price gets sent.
//
// **There is no bulk anything in this file, and there will not be** *(R9a,
// R12b)*. Every action takes one order. The absence is the control: it forces
// an attacker to work one order at a time, and it stops him approving twelve
// prices with a thumb.

/**
 * Every action re-runs the gate.
 *
 * A layout does not re-run for a server action, so the check that guarded the
 * page that rendered the form has not guarded this. One forgotten `await` here
 * is a stranger with a POST and every live order.
 */
async function gate() {
	await requireSession();
	return getDb();
}

function orderId(form: FormData): string {
	const value = form.get("orderId");
	if (typeof value !== "string" || !value) throw new Error("missing order");
	return value;
}

function emailKey(form: FormData): EmailKey {
	const value = form.get("emailKey");
	if (typeof value !== "string" || !value) throw new Error("missing message");
	return value as EmailKey;
}

/**
 * The money landed. **A payment row awaiting his eye becomes a payment** *(R4)*
 * — the customer's claim was never an order state, and confirming it is what
 * makes it one.
 */
export async function confirmPayment(form: FormData): Promise<void> {
	const db = await gate();
	const id = orderId(form);
	const paymentId = String(form.get("paymentId") ?? "");

	const [payment] = await db
		.update(schema.payments)
		.set({ confirmedAt: new Date(), updatedAt: new Date() })
		.where(eq(schema.payments.id, paymentId))
		.returning({ amount: schema.payments.amount, gate: schema.payments.gate });

	if (payment) {
		// R11's *payment received fires up to three times, saying something
		// different at each gate.* A collection order has one gate and no name for
		// it, which is the unsuffixed key.
		const key: EmailKey =
			payment.gate === "design_fee"
				? "payment_received_design_fee"
				: payment.gate === "cutting"
					? "payment_received_cutting"
					: payment.gate === "balance"
						? "payment_received_balance"
						: "payment_received";

		await sendOrderEmail(id, key, { amount: payment.amount });
	}

	revalidatePath("/dashboard");
}

/**
 * Finished stitching, which is **not** got-to-the-post-office *(R6)*.
 *
 * No email: there are nine and this is not one of them. It exists because the
 * duration between it and `shipped` is the one calculated timeframes will want.
 */
export async function markComplete(form: FormData): Promise<void> {
	const db = await gate();
	await db
		.insert(schema.orderEvents)
		.values({ orderId: orderId(form), type: "making_complete", actor: "founder" });
	revalidatePath("/dashboard");
}

/** The package is posted. */
export async function markShipped(form: FormData): Promise<void> {
	const db = await gate();
	const id = orderId(form);
	const note = String(form.get("note") ?? "").trim();

	await db.insert(schema.orderEvents).values({ orderId: id, type: "shipped", actor: "founder" });
	// One of the four that carry his personal note *(R9d)*.
	await sendOrderEmail(id, "on_its_way", { note: note || null });
	revalidatePath("/dashboard");
}

/**
 * It arrived. **Delivered matters** *(R4)*: the alteration window runs from
 * receipt, so without it the clock has no start — and it carries the welcome
 * into Abantu.
 */
export async function markDelivered(form: FormData): Promise<void> {
	const db = await gate();
	const id = orderId(form);
	await db.insert(schema.orderEvents).values({ orderId: id, type: "delivered", actor: "founder" });
	await sendOrderEmail(id, "delivered", { amount: null });
	revalidatePath("/dashboard");
}

/**
 * He sent the WhatsApp version by hand.
 *
 * The row does not clear until this lands, which is what makes the customer's
 * chosen channel a promise rather than a preference *(R11)*. **Never
 * automated** — no Business API, no scheduled send: Meta bills per
 * business-initiated message outside a 24-hour window, and his own thumb is
 * free.
 */
export async function noteWhatsappSent(form: FormData): Promise<void> {
	await gate();
	await markWhatsappSent(orderId(form), emailKey(form));
	revalidatePath("/dashboard");
}

/**
 * Try a refused message again.
 *
 * *Could not reach them, resend or call.* Phone is required on every order, so
 * the fallback is human and already in his hand *(R11)*.
 */
export async function resendMessage(form: FormData): Promise<void> {
	await gate();
	await sendOrderEmail(orderId(form), emailKey(form));
	revalidatePath("/dashboard");
}
