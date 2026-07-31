// Verifying a webhook signature, by hand.
//
// Resend signs with Svix, and Svix ships an SDK. The SDK is not installed and
// will not be: this is one HMAC over a string that the specification writes out
// in a line, and `CLAUDE.md`'s rule is a hand-written forty lines over a
// package. It is also the kind of code that should be readable in full at the
// point where it decides whether to trust a stranger's POST.
//
// The scheme, in whole:
//
//   signed content = `${svix-id}.${svix-timestamp}.${raw body}`
//   signature      = base64( HMAC-SHA256( key, signed content ) )
//   header         = "v1,<sig> v1,<sig>"   — space-separated, versioned
//   secret         = "whsec_<base64 key>"  — the key is the part after the prefix
//
// **Nothing here parses the body.** The signature is checked over the exact
// bytes that arrived, before anything reads them, because verifying a
// re-serialised payload verifies something the sender never signed.

/** The three headers Svix sends. Absent ones are a rejection, not a default. */
export interface SignatureHeaders {
	id: string | null;
	timestamp: string | null;
	signature: string | null;
}

/**
 * How far out of date a webhook may be. Five minutes, which is Svix's own
 * tolerance.
 *
 * Without it a signature is valid forever, and anyone who has ever seen one
 * request — a proxy log, a mirrored response — can replay it whenever they like.
 * The signature proves who sent it; only this proves when.
 */
export const TIMESTAMP_TOLERANCE_SECONDS = 300;

/** base64 → bytes, with no Node `Buffer`. This runs in the Workers runtime. */
function fromBase64(value: string): ArrayBuffer {
	const binary = atob(value);
	const buffer = new ArrayBuffer(binary.length);
	const bytes = new Uint8Array(buffer);
	for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
	return buffer;
}

function toBase64(bytes: ArrayBuffer): string {
	const view = new Uint8Array(bytes);
	let binary = "";
	for (const byte of view) binary += String.fromCharCode(byte);
	return btoa(binary);
}

/**
 * Compare two strings without leaking where they first differ.
 *
 * A `===` on a signature returns as soon as a byte disagrees, and the time that
 * takes is a measurement of how much of the signature was right. That is a
 * forgery oracle. Constant work regardless of the answer, always over the same
 * number of characters.
 */
function equals(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let difference = 0;
	for (let i = 0; i < a.length; i += 1) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return difference === 0;
}

/**
 * Whether this request really came from the provider.
 *
 * **Fails closed on everything**: a missing header, an unparseable timestamp, an
 * old one, a malformed secret, no matching version. An unauthenticated webhook
 * that writes to the Today queue is a way for a stranger to fill his morning
 * with fictional bounces on real orders, which is worse than a webhook that does
 * not work — one is noticed on the first test, the other on none.
 */
export async function verifyWebhook(options: {
	/** The raw request body, exactly as it arrived. Never re-serialised. */
	body: string;
	headers: SignatureHeaders;
	/** `whsec_…`, from the provider's dashboard. */
	secret: string;
	/** Now, in seconds. Passed in so the tolerance window is testable. */
	nowSeconds: number;
}): Promise<boolean> {
	const { body, headers, secret, nowSeconds } = options;

	if (!headers.id || !headers.timestamp || !headers.signature) return false;
	if (!secret.startsWith("whsec_")) return false;

	const sent = Number(headers.timestamp);
	if (!Number.isFinite(sent)) return false;
	if (Math.abs(nowSeconds - sent) > TIMESTAMP_TOLERANCE_SECONDS) return false;

	let key: CryptoKey;
	try {
		key = await crypto.subtle.importKey(
			"raw",
			fromBase64(secret.slice("whsec_".length)),
			{ name: "HMAC", hash: "SHA-256" },
			false,
			["sign"],
		);
	} catch {
		// A secret that is not base64 is a misconfiguration, and a misconfigured
		// verifier must refuse rather than wave things through.
		return false;
	}

	const expected = toBase64(
		await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${headers.id}.${sent}.${body}`)),
	);

	// The header may carry several, so that a secret can be rotated without a
	// window where neither key works. Any one matching is a match.
	return headers.signature
		.split(" ")
		.map((part) => part.split(","))
		.some(([version, value]) => version === "v1" && value !== undefined && equals(value, expected));
}
