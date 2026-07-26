// The email adapter. This is the only module that may talk to an email
// provider — nothing else in the app imports a mail SDK.
//
// Email is the automated rail. Every transactional message goes out as email
// whatever channel the customer chose, because a chat thread is not durable
// storage and the token needs a permanent address. WhatsApp is hand-sent.
//
// The whole contract is one `send()`. Interface only — no provider is
// configured yet, so it throws.

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
 * of a decision made upstream and nothing at this layer would read it. If a
 * `Content-Language` header ever earns its place, it comes back then.
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
 * The single body every method has until a provider is configured. One
 * thrower, so the real implementation replaces bodies and leaves the signature
 * above untouched.
 *
 * Returns `never`, which is why it satisfies the method's return type without
 * resolving to a fake success — the one failure mode this adapter must never
 * have.
 */
function notImplemented(): never {
	throw new Error(
		"email: not implemented — email provider not yet configured (later phase)",
	);
}

/**
 * The adapter instance. The app imports this; when a provider is chosen, the
 * body below is filled in and nothing that imports it changes.
 */
export const email: Email = {
	send: notImplemented,
};
