// The order token.
//
// **128 bits, in the path** — `/o/<token>`, never a query string, never a
// sequential id *(R5)*. Short enough to paste into a message without looking
// like phishing.
//
// Stored raw, and that survived R12 with its reasoning recorded so it does not
// come back: hashing is not a trade-off here but an incompatibility. A hash
// cannot be reversed into a link, so re-sending would have to issue a *new*
// token on every status change — killing the customer's bookmarked copy and
// contradicting *no expiry, ever*.
//
// **Never logged**, never in an error report, and never rendered in the
// dashboard *(R12d)*. The one exception is the WhatsApp draft, which must carry
// it.

/**
 * A fresh token: 128 bits of `crypto.getRandomValues`, base64url.
 *
 * Twenty-two characters, no padding, nothing that needs escaping in a URL or
 * breaks across a line in a chat message.
 */
export function mintToken(): string {
	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);

	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
