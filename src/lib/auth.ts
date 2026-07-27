// The auth adapter. This is the only module that may talk to Supabase auth —
// nothing else in the app reaches for the Supabase client to ask who is
// signed in.
//
// The admin session and nothing else. Customers have no accounts: an order is
// reached by the token in its path, which is a different mechanism entirely
// and none of this module's business. There is one authenticated user.
//
// The session is server state, not client state. A token that says it is
// valid is not the same as a session that is still allowed, and only the
// server holds the second answer — which is why the cookie is server-set,
// httpOnly, Secure, SameSite=Lax and scoped to the dashboard path. A session
// JavaScript can read is a session the kill switch cannot reach.
//
// Interface only. The wiring is pending the schema, so every method throws.

/**
 * A verified admin session, as the code behind the dashboard gate receives it.
 *
 * **Holding one means this request was verified**, not that a token exists
 * somewhere. Every field here is on the far side of a check that already
 * passed: the cookie was read, the token verified, and the issue time compared
 * against `sessions_valid_after` on the admin row. A caller never re-checks;
 * it either has a session or it has `null`.
 *
 * There is no profile on this shape because there is no profile — one admin,
 * one login, and a name the dashboard never has to display back to the person
 * who already knows it. Anything added here would be decoration around an
 * identifier.
 */
export interface Session {
	/** The admin row this session belongs to. */
	adminId: string;
	/**
	 * When the session was issued, which is the value `sessions_valid_after` is
	 * compared against.
	 *
	 * Kept on the shape as the evidence of that comparison rather than as work
	 * left for the caller — by the time this exists, the check has passed. It
	 * is also what makes the thirty-day box a real boundary rather than a
	 * setting nobody enforces.
	 */
	issuedAt: Date;
}

/**
 * Everything the app may ask about the admin session: read and verify it, or
 * end it everywhere.
 *
 * **There is no `signIn` here, and that is a decision rather than an
 * omission.** Getting in is password *and* magic link, both, every time — a
 * multi-step exchange whose shape is not yet decidable, and whose result is a
 * cookie written onto a response rather than a value returned to a caller.
 * Modelling it now would be inventing a signature to keep the interface
 * symmetrical.
 *
 * That is not licence for a route handler to import the Supabase client and
 * run the exchange itself. The rule that no page, component or route handler
 * touches a provider SDK holds here as it does everywhere; the sign-in
 * exchange lands in this module when its shape is known. What this interface
 * covers today is the part that runs on **every** dashboard request, which is
 * the part the rest of the app needs to type against now.
 */
export interface Auth {
	/**
	 * The session for this request, or `null`.
	 *
	 * **The single gate every dashboard request passes.** It reads the session
	 * cookie, verifies the token, and compares the issue time against
	 * `sessions_valid_after` on the admin row — all three, every request. The
	 * third is what makes revocation instant: a session issued before that
	 * timestamp is dead however valid its token still looks, and however long
	 * the token has left to run.
	 *
	 * No session, an invalid or expired token, and a revoked session all
	 * collapse to `null`, **deliberately**. The caller cannot tell them apart
	 * and has no use for the difference: all three mean not signed in, and all
	 * three lead to the same place. A richer return would only tempt a call
	 * site into treating one of them as nearly signed in.
	 */
	current(): Promise<Session | null>;

	/**
	 * Sign out everywhere, immediately.
	 *
	 * Advances `sessions_valid_after` on the admin row to now, which kills
	 * every session issued before this moment — including the one calling it.
	 *
	 * **This is the server-side kill switch, and it is the only thing that
	 * works when it is needed.** The case it exists for is a phone in someone
	 * else's hands: a cookie jar we cannot reach, holding a token that has not
	 * expired and will not for another quarter of an hour. Clearing a cookie
	 * asks that device to co-operate. This does not ask.
	 *
	 * It takes no argument because there is nothing to select — one admin, and
	 * everything before now.
	 */
	revoke(): Promise<void>;
}

/**
 * The single body every method has until the wiring exists. One thrower, so
 * the real implementation replaces bodies and leaves the signatures above
 * untouched.
 *
 * Returns `never`, which is why it satisfies each method's return type without
 * any of them resolving to a fake success. It matters more here than anywhere:
 * a `current()` stubbed to return something would be a dashboard gate that
 * opens.
 */
function notImplemented(): never {
	throw new Error(
		"auth: not implemented — Supabase auth wiring pending schema (weekend)",
	);
}

/**
 * The adapter instance. The app imports this; when the wiring lands, the
 * bodies below are filled in and nothing that imports them changes.
 */
export const auth: Auth = {
	current: notImplemented,
	revoke: notImplemented,
};
