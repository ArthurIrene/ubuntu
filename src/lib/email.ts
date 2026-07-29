// The email adapter. This is the only module that may talk to an email
// provider — nothing else in the app imports a mail SDK.
//
// Email is the automated rail. Every transactional message goes out as email
// whatever channel the customer chose, because a chat thread is not durable
// storage and the token needs a permanent address. WhatsApp is hand-sent.
//
// The whole contract is one `send()`.

/**
 * A message with nothing left to decide: addressed, worded and ready for the
 * wire.
 *
 * Everything upstream of here is already resolved. Bodies are code, keyed in
 * both locales and picked by `orders.locale`; the founder's personal note, on
 * the four emails that carry one, is already appended above the signature.
 * This layer composes nothing — it only sends.
 *
 * There is no `from` field: the sending identity is one address configured
 * once on the provider, not a per-message choice, and inventing a parameter
 * for it would imply the app varies something it does not.
 *
 * There is no `locale` field either. The subject and body arrive already
 * selected by the order's locale, so carrying it here would be a second copy
 * of a decision made upstream and nothing at this layer would read it.
 */
export interface EmailMessage {
	/** The recipient address. One per send — there is no bulk send here. */
	to: string;
	/** Already in the recipient's locale. */
	subject: string;
	/**
	 * The real body. These are designed emails, not notifications, so HTML is
	 * what is actually sent and read.
	 */
	html: string;
	/**
	 * The plain-text alternative, sent alongside the HTML rather than instead
	 * of it — the two parts are the same message in two forms.
	 *
	 * Worth writing for every email: it is what text-only readers and preview
	 * panes show, and an HTML-only message is a weaker-looking one to spam
	 * filters. Optional because a missing fallback should not be able to block
	 * an order email from going out.
	 */
	text?: string;
}

/**
 * Sending one email. The entire provider surface the app is allowed to touch.
 */
export interface Email {
	/**
	 * Send a finished message. Resolves once the provider has accepted it.
	 *
	 * **Throws on failure rather than returning a status.** A boolean would put
	 * the burden of noticing on every call site, and a silently ignored `false`
	 * is indistinguishable from a send that worked — which, on the rail that
	 * carries the order token, means a customer who never hears anything and a
	 * founder who never learns they did not.
	 *
	 * Accepted is not delivered. A throw catches what the provider rejects at
	 * hand-off; bounces arrive afterwards and are not this layer's business.
	 * Both belong to the same later phase: a failed transactional send becomes
	 * a row in his queue, because the recovery is his hand, not a retry loop.
	 */
	send(message: EmailMessage): Promise<void>;
}

/**
 * Thrown when no provider is configured, so a caller can tell *nothing was
 * wired up* from *the provider refused this message*.
 *
 * The queue reads the difference: a missing key is a deployment problem he
 * should be told about in plain words, and a rejected recipient is a row in
 * his queue saying *couldn't reach her, resend or call*.
 */
export class EmailNotConfiguredError extends Error {
	constructor() {
		super("email: RESEND_API_KEY and EMAIL_FROM are not set");
	}
}

/**
 * **Resend**, over its REST API, with no SDK.
 *
 * Chosen against the free-tier constraint and checked the way `CLAUDE.md` asks
 * every service to be checked before it is added:
 *
 * - **No card at signup**, and no card to send. 3,000 messages a month and 100
 *   a day on the free plan, against nine transactional emails per order.
 * - **One domain** on the free plan. Until that domain's DNS is verified,
 *   Resend will only deliver to the account holder's own address — which is
 *   enough to walk an order end to end in preview, and not enough to mail a
 *   customer. The records are three CNAMEs on a zone already at Cloudflare.
 * - The SDK is not installed. This is two `fetch` calls against a documented
 *   JSON endpoint, and the 3 MiB budget does not need to carry a package for
 *   it.
 *
 * Swapping providers is this function and the two environment variables it
 * reads. Nothing else in the app knows the name Resend.
 */
async function resendSend(message: EmailMessage): Promise<void> {
	const { getCloudflareContext } = await import("@opennextjs/cloudflare");
	const env = getCloudflareContext().env as unknown as Record<string, string | undefined>;

	const key = env.RESEND_API_KEY;
	const from = env.EMAIL_FROM;
	if (!key || !from) {
		// Which one, by name. A variable that is *present but empty* is the
		// expensive version of this failure: `wrangler` lists it among the loaded
		// bindings either way, so the deployment looks configured and the send
		// silently never happens. Naming the empty one costs a line and saves
		// that hunt.
		const absent = [!key && "RESEND_API_KEY", !from && "EMAIL_FROM"].filter(Boolean).join(" and ");
		console.error(`email: not configured — ${absent} is missing or empty`);
		throw new EmailNotConfiguredError();
	}

	const response = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${key}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			from,
			to: [message.to],
			subject: message.subject,
			html: message.html,
			...(message.text ? { text: message.text } : {}),
		}),
	});

	// Resend answers with a small JSON object either way: `{ id }` on success,
	// `{ statusCode, name, message }` on refusal. Both are read, and only the
	// fields named below are ever logged.
	const body = (await response.json().catch(() => ({}))) as {
		id?: string;
		name?: string;
		message?: string;
	};

	if (!response.ok) {
		// **`name` and `message`, never the body we sent.** Resend's error object
		// describes its own refusal — `validation_error`, *you can only send
		// testing emails to your own address* — and does not echo the html. That
		// distinction is the whole reason this is loggable at all: an order
		// email's html carries the order token, which `CLAUDE.md` forbids from
		// reaching a log under any circumstances, this one included.
		//
		// Worth having, because the two failures that actually happen here are
		// indistinguishable from the outside: an unverified sending domain, and
		// the free tier refusing every recipient except the account holder's own
		// address.
		console.error(
			`email: Resend refused the message (${response.status} ${body.name ?? "unknown"}): ${
				body.message ?? "no message"
			}`,
		);
		throw new Error(`email: provider rejected the message (${response.status})`);
	}

	// The id and nothing else — no recipient, no subject. It is what turns *no
	// email arrived* into a question the provider's own dashboard can answer.
	console.log(`email: Resend accepted the message (${body.id ?? "no id"})`);
}

/**
 * The adapter instance. The app imports this; swapping providers replaces the
 * body above and nothing that imports this changes.
 */
export const email: Email = {
	send: resendSend,
};
