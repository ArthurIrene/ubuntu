// Sending an order email, and recording that it went.
//
// One place, so that every gate in the dashboard fires the same way and lands
// the same row in the log. **The email always fires, whatever channel the
// customer chose** *(R11)* — it is the permanent address of the order token,
// and a chat thread is not durable storage.
//
// A send that the provider refuses becomes a `message_failed` event, which
// becomes a row in the Today queue — *could not reach them, resend or call*.
// Without it a bounced Confirmed reads as a stranger who changed their mind:
// the customer never sees the price, never pays, and lands in Lapsed looking
// exactly like ordinary attrition.

import { and, eq } from "drizzle-orm";

import { getDb, schema } from "@/db/client";
import { orderEmail, whatsappDraft, type EmailKey, type OrderEmailVars } from "@/emails/order";
import { email as mailer, EmailNotConfiguredError } from "@/lib/email";
import { messageNote } from "@/lib/order-state";
import { orderLink } from "@/lib/origin";
import type { Locale } from "@/lib/locale";

/** Everything an email needs about an order, in one read. */
async function load(orderId: string) {
	const db = await getDb();

	const [row] = await db
		.select({
			token: schema.orders.token,
			kind: schema.orders.kind,
			locale: schema.orders.locale,
			preferredChannel: schema.orders.preferredChannel,
			currency: schema.orders.currency,
			confirmedTotal: schema.orders.confirmedTotal,
			customerName: schema.customers.name,
			customerEmail: schema.customers.email,
			customerPhone: schema.customers.phone,
			redactedAt: schema.customers.redactedAt,
			pieceName: schema.pieces.name,
		})
		.from(schema.orders)
		.innerJoin(schema.customers, eq(schema.customers.id, schema.orders.customerId))
		.leftJoin(schema.pieces, eq(schema.pieces.id, schema.orders.pieceId))
		.where(eq(schema.orders.id, orderId))
		.limit(1);

	return row ?? null;
}

/** The globals an email may quote — the reply time, and nothing else. */
async function replyTimeDays(): Promise<number | null> {
	const db = await getDb();
	const [row] = await db
		.select({ replyTimeDays: schema.settings.replyTimeDays })
		.from(schema.settings)
		.where(eq(schema.settings.id, 1))
		.limit(1);
	return row?.replyTimeDays ?? null;
}

/**
 * What a message carries out to the provider so that a bounce can find its way
 * home *(R11)*.
 *
 * A bounce arrives on a webhook hours later knowing only what the message told
 * it. Without this the only route back is the recipient address, and a customer
 * with two open orders makes that a guess — which is precisely the case where a
 * missed *couldn't reach her* costs the most.
 *
 * `orderId_emailKey`. The order id is a UUID and contains no underscore, so the
 * first one splits it; the key contains several, so nothing else would. Both
 * halves are already restricted to the characters a provider tag permits.
 *
 * **Never the token, never a name, never a measurement.** It travels to a third
 * party and comes back through a URL anyone can POST to.
 */
export function messageReference(orderId: string, key: EmailKey): string {
	return `${orderId}_${key}`;
}

/** The reference, read back. Null when it is not one of ours. */
export function parseMessageReference(
	reference: string,
): { orderId: string; key: EmailKey } | null {
	const split = reference.indexOf("_");
	if (split <= 0 || split === reference.length - 1) return null;
	return {
		orderId: reference.slice(0, split),
		key: reference.slice(split + 1) as EmailKey,
	};
}

export interface SendOptions {
	/** His personal note, on the four emails that carry one *(R9d)*. */
	note?: string | null;
	/** An explicit figure, where the email names one that is not the order total. */
	amount?: number | null;
	/** An explicit number of days, where it is not the reply time. */
	days?: number | null;
}

/**
 * Send one of the nine, and log it.
 *
 * Returns whether the provider accepted it. **It does not throw**: a gate that
 * has already happened — the payment landed, the package is posted — must be
 * recorded even when the mail does not go, or the dashboard and the world
 * disagree about a fact he witnessed. The failure becomes a queue row instead.
 */
export async function sendOrderEmail(
	orderId: string,
	key: EmailKey,
	options: SendOptions = {},
): Promise<boolean> {
	const db = await getDb();
	const order = await load(orderId);

	// A redacted customer has no address to write to, and that is the erasure
	// working rather than an error *(R16)*.
	if (!order || !order.customerEmail || order.redactedAt) return false;

	const vars = await buildVars(order, options);
	const message = {
		...orderEmail(key, order.locale as Locale, order.customerEmail, vars),
		reference: messageReference(orderId, key),
	};

	try {
		await mailer.send(message);
		await db.insert(schema.orderEvents).values({
			orderId,
			type: "message_sent",
			actor: "system",
			note: messageNote("email", key),
		});
		return true;
	} catch (error) {
		// **Three outcomes, not two.** *Nothing was wired up* is a different fact
		// from *the provider refused this message*, and the adapter throws a named
		// error so that this line can tell them apart *(email.ts)*.
		//
		// A missing key is a deployment problem: it is not the customer's address
		// that failed, and filing it as a bounce would put a *couldn't reach them*
		// row in his queue for every order on a site whose mail was never
		// configured — which is the queue crying wolf on day one, and the fastest
		// way to teach him to stop reading it.
		if (error instanceof EmailNotConfiguredError) return false;

		// The error itself is deliberately not carried into the log. A provider
		// error echoes the message it rejected, and the message carries the token.
		await db.insert(schema.orderEvents).values({
			orderId,
			type: "message_failed",
			actor: "system",
			note: messageNote("email", key),
		});
		return false;
	}
}

/**
 * A bounce, come back *(R11)*.
 *
 * **A failed send becomes a row in his queue, never silence.** Without it a
 * bounced Confirmed reads as a stranger who changed their mind: the customer
 * never sees the price, never pays, and lands in Lapsed looking exactly like
 * ordinary attrition — and the one recovery that works is the phone number the
 * form already required.
 *
 * There is no bounce column. R11 called for *one webhook, one column*, and the
 * append-only log *is* that column: `message_failed` already exists as an event
 * type, `queueActions` already turns one into a `resend_failed` row, and a
 * second place recording the same fact is a second place to disagree with it.
 *
 * Idempotent, because a webhook is delivered at least once. A provider that
 * retries three times must not produce three identical rows in a queue whose
 * whole claim is that it is exactly what is waiting on him.
 */
export async function recordBounce(orderId: string, key: EmailKey): Promise<void> {
	const db = await getDb();
	const note = messageNote("email", key);

	const [already] = await db
		.select({ id: schema.orderEvents.id })
		.from(schema.orderEvents)
		.where(
			and(
				eq(schema.orderEvents.orderId, orderId),
				eq(schema.orderEvents.type, "message_failed"),
				eq(schema.orderEvents.note, note),
			),
		)
		.limit(1);
	if (already) return;

	await db.insert(schema.orderEvents).values({
		orderId,
		type: "message_failed",
		actor: "system",
		note,
	});
}

async function buildVars(
	order: NonNullable<Awaited<ReturnType<typeof load>>>,
	options: SendOptions,
): Promise<OrderEmailVars> {
	// An explicit `null` means *this email names no figure*; omitting it means
	// *use the order's confirmed total*. The two are different intentions and
	// `??` would collapse them.
	const amount = options.amount !== undefined ? options.amount : order.confirmedTotal;

	return {
		// A name is required on every order, so the fallback is for a row mid-
		// erasure rather than for an ordinary customer.
		name: order.customerName ?? "Hello",
		piece: order.pieceName ?? undefined,
		amount: amount === null ? null : { value: amount, currency: order.currency },
		days: options.days ?? (await replyTimeDays()),
		link: await orderLink(order.token),
		note: options.note ?? null,
	};
}

/**
 * The `wa.me` draft for a message, pre-written and ready for his thumb *(R11)*.
 *
 * **This is the one place a token is allowed to reach the dashboard** *(R12d)*.
 * R9c's panels mean he never needs the customer's URL for anything else, so a
 * session yields one token per deliberate action rather than a table — which is
 * the same principle as the bulk ban: the absence is the control.
 *
 * Returns null when there is no phone to write to.
 */
export async function whatsappHref(
	orderId: string,
	key: EmailKey,
	options: SendOptions = {},
): Promise<string | null> {
	const order = await load(orderId);
	if (!order || !order.customerPhone || order.redactedAt) return null;

	const vars = await buildVars(order, options);
	return whatsappDraft(key, order.locale as Locale, order.customerPhone, vars);
}

/**
 * Record that he sent the WhatsApp version by hand.
 *
 * The queue row does not clear until this lands, which is what makes the
 * customer's chosen channel a promise rather than a preference *(R11)*.
 */
export async function markWhatsappSent(orderId: string, key: EmailKey): Promise<void> {
	const db = await getDb();
	await db.insert(schema.orderEvents).values({
		orderId,
		type: "message_sent",
		actor: "founder",
		note: messageNote("whatsapp", key),
	});
}
