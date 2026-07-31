import { parseMessageReference, recordBounce } from "@/lib/notify";
import { verifyWebhook } from "@/lib/webhook-signature";

// The bounce webhook. **A failed send becomes a row in his queue, never
// silence** *(R11)*.
//
// Without this, a bounced *Confirmed* is indistinguishable from a stranger who
// changed their mind: the customer never sees the price, never pays, and lands
// in Lapsed looking exactly like ordinary attrition. Phone is already required
// on every order, so the recovery is his hand — *couldn't reach her, resend or
// call* — and all this has to do is make the failure visible.
//
// ## No column, and no migration
//
// R11 asked for *one webhook, one column*. The column already exists as the
// append-only log: `message_failed` is an `order_event_type` from the first
// migration, `queueActions` already turns one into a `resend_failed` row, and a
// bounce flag on the order beside it would be a second place recording the same
// fact and a second place to disagree with it. **Nothing in this phase generates
// a migration**, which is the fence, and this is the reason it did not need to.
//
// ## What is live and what is not
//
// Delivery is Phase 7 — the sending domain is unverified — so no real bounce can
// arrive yet. What is built here is the whole path: verify, correlate, append,
// queue. Turning it on is pasting the signing secret into a Cloudflare secret
// and the URL into Resend's dashboard. Until then it is proven by a signed
// request made by hand, which exercises every line below except the provider's
// half of the handshake.

export const dynamic = "force-dynamic";

/**
 * What Resend sends. **Only the three fields that are read are named.**
 *
 * The recipient address, the subject and the provider's own message id are all
 * in the payload and all deliberately ignored: the reference is the correlation,
 * and reading the rest would be an invitation to log it.
 */
interface BounceEvent {
	type?: string;
	data?: { tags?: { name?: string; value?: string }[] };
}

export async function POST(request: Request): Promise<Response> {
	const { getCloudflareContext } = await import("@opennextjs/cloudflare");
	const env = getCloudflareContext().env as unknown as Record<string, string | undefined>;
	const secret = env.RESEND_WEBHOOK_SECRET;

	// **No secret, no webhook.** An endpoint that writes to the Today queue and
	// accepts anything is a way for a stranger to fill his morning with fictional
	// bounces on real orders. 503 rather than 404, because *not configured* is
	// something he should be able to see when he goes looking for why nothing
	// arrives.
	if (!secret) {
		console.error("email bounce: RESEND_WEBHOOK_SECRET is missing or empty");
		return new Response(null, { status: 503 });
	}

	// The raw bytes, read once and verified before anything parses them. A
	// signature checked over a re-serialised body verifies something the sender
	// never signed.
	const body = await request.text();

	const verified = await verifyWebhook({
		body,
		headers: {
			id: request.headers.get("svix-id"),
			timestamp: request.headers.get("svix-timestamp"),
			signature: request.headers.get("svix-signature"),
		},
		secret,
		nowSeconds: Math.floor(Date.now() / 1000),
	});

	if (!verified) return new Response(null, { status: 401 });

	let event: BounceEvent;
	try {
		event = JSON.parse(body) as BounceEvent;
	} catch {
		return new Response(null, { status: 400 });
	}

	// Only a bounce. `email.delivered`, `email.opened` and the rest arrive on the
	// same endpoint and are none of this app's business — an opened-email tally
	// is analytics, and analytics does not belong anywhere near an order.
	if (event.type !== "email.bounced") return new Response(null, { status: 204 });

	const tag = event.data?.tags?.find((entry) => entry.name === "reference")?.value;
	const reference = tag ? parseMessageReference(tag) : null;

	// A bounce we cannot place is not an error the provider should retry — it is
	// a message that left before this rail existed, or one sent by hand from the
	// provider's own dashboard. Accept it and let it go.
	if (!reference) return new Response(null, { status: 202 });

	await recordBounce(reference.orderId, reference.key);

	// 200 rather than 204, because a webhook sender reads a body-less success as
	// success either way and a plain 200 is what its retry logic is happiest
	// with. `recordBounce` is idempotent, so a retry after a timeout on our side
	// costs one query and produces no second row.
	return new Response(null, { status: 200 });
}
