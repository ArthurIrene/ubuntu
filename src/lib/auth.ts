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

import { eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getDb, schema } from "@/db/client";
import { siteOrigin } from "@/lib/origin";

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

/**
 * A verified admin session, as the code behind the dashboard gate receives it.
 *
 * **Holding one means this request was verified**, not that a token exists
 * somewhere. Every field here is on the far side of a check that already
 * passed: the cookie was read, the signature verified, and the issue time
 * compared against `sessions_valid_after` on the admin row. A caller never
 * re-checks; it either has a session or it has `null`.
 *
 * There is no profile on this shape because there is no profile — one admin,
 * one login, and a name the dashboard never has to display back to the person
 * who already knows it.
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
 * Why a login attempt did not produce a session.
 *
 * Deliberately coarse. The screens render one sentence for `rejected` whatever
 * caused it — an unknown address, a wrong password and a consumed link are the
 * same answer to whoever is typing, and telling them apart is how an attacker
 * learns which half they got right.
 */
export type LoginFailure = "rejected" | "unconfigured" | "unavailable";

export type LoginResult<T> = { ok: true; value: T } | { ok: false; reason: LoginFailure };

/**
 * The two ways a half-finished login can be carrying a verified magic link:
 * on its way to the password prompt, or on its way back to an ownership change.
 */
type LinkPurpose = "login" | "reauth";

/**
 * A minted link and the mailbox it belongs in.
 *
 * The address comes back from the adapter rather than being reused from the
 * form, so the one place that decides where a sign-in link may be delivered is
 * the admin row.
 */
export interface LoginLink {
	to: string;
	url: string;
}

// ---------------------------------------------------------------------------
// Getting in — the shape R12b settled and this module now implements
// ---------------------------------------------------------------------------

/**
 * Everything the app may ask about the admin session.
 *
 * ## Password *and* magic link, both, every login *(R12b)*
 *
 * Two steps, in this order, and the order is the design:
 *
 * 1. **`beginLogin(email)`** — we ask Supabase for a magic link and mail it.
 *    Nothing is checked beyond the address being the admin's, and nothing is
 *    granted.
 * 2. **`completeLogin(tokenHash, password)`** — the link opens a page that
 *    asks for the password, and the two are submitted together. Both are
 *    verified against Supabase, and only then is a session minted, on the
 *    browser that opened the link.
 *
 * **Link first, password second, deliberately.** The reverse order has to bind
 * the two halves with a cookie set before the mail is opened, and a mail app
 * that opens links in its own in-app browser then loses the binding and locks
 * him out. This way the session lands on whichever device opened the link,
 * which is the device he is holding, and the password — *the one factor his
 * phone does not contain* — is still required from memory afterwards.
 *
 * **Both halves travel in one POST, not in a GET.** A link that granted
 * anything by being fetched would be spent by the first mail client, scanner
 * or link-preview bot that touched it. Opening the link renders a form; it
 * changes nothing.
 *
 * A consequence worth naming: the password cannot be brute-forced without a
 * live magic link in hand first.
 *
 * ## Why the cookie is ours and not Supabase's
 *
 * Supabase issues a JWT. We do not keep it. What is stored is a short signed
 * statement of our own — admin id, issue time, expiry — because the question
 * every dashboard request has to answer is *is this session still allowed*,
 * and only `sessions_valid_after` on the admin row answers that. Carrying
 * Supabase's access and refresh tokens instead would add JWT verification and
 * refresh rotation to buy an answer we would have to override anyway.
 *
 * The ~15-minute JWT expiry in the project settings *(R12c)* still matters and
 * still stands: it bounds anything Supabase issues during the exchange above,
 * all of which is discarded before the response is written.
 */
export interface Auth {
	/**
	 * The session for this request, or `null`.
	 *
	 * **The single gate every dashboard request passes.** It reads the session
	 * cookie, verifies the signature, and compares the issue time against
	 * `sessions_valid_after` on the admin row — all three, every request. The
	 * third is what makes revocation instant: a session issued before that
	 * timestamp is dead however valid its cookie still looks.
	 *
	 * No session, a tampered or expired cookie, and a revoked session all
	 * collapse to `null`, **deliberately**. The caller cannot tell them apart
	 * and has no use for the difference: all three mean not signed in, and all
	 * three lead to the same place.
	 */
	current(): Promise<Session | null>;

	/**
	 * Step one. Mint a magic link for the admin address and hand it back for
	 * delivery.
	 *
	 * Returns the URL rather than sending it, because sending is the email
	 * adapter's job and this module does not import it — the caller composes
	 * the message. **The link is never returned to the browser**, never
	 * rendered, and never logged; it goes to the mailbox and nowhere else.
	 *
	 * An address that is not the admin's is rejected with the same `rejected`
	 * every other failure gets, and no mail is sent.
	 */
	beginLogin(email: string, purpose?: LinkPurpose): Promise<LoginResult<LoginLink>>;

	/**
	 * Step two. Verify the link **and** the password together, and mint the
	 * session.
	 *
	 * Either half failing gives the same `rejected`, so the screen cannot be
	 * used to learn which one was right.
	 */
	completeLogin(tokenHash: string, password: string): Promise<LoginResult<Session>>;

	/**
	 * Redeem a link for an ownership change rather than for a session *(R12b)*.
	 *
	 * Sets a ten-minute cookie that {@link Auth.hasFreshLink} reads. **It grants
	 * nothing on its own** — the gate reads a different cookie, and a browser
	 * holding only this one is not signed in.
	 */
	redeemReauth(tokenHash: string): Promise<LoginResult<true>>;

	/**
	 * Whether this request carries a magic link redeemed for an ownership
	 * change within the last ten minutes *(R12b)*.
	 *
	 * **Re-auth defends ownership, not actions.** Changing the admin email or
	 * the recovery address demands this; confirming a price does not, because a
	 * step-up on his daily job costs a mail round trip every time and stops
	 * nobody already reading his mail.
	 */
	hasFreshLink(): Promise<boolean>;

	/**
	 * Change the login address, in **both** places that hold it.
	 *
	 * The password lives in Supabase and the revocation clock lives in our
	 * `admin` row, and the two are joined by this address. Updating one without
	 * the other is a login that stops working — so it is one method here rather
	 * than two calls a screen has to remember to make in order.
	 *
	 * The caller has already proved a fresh link *(R12b)*; this does not check
	 * again.
	 */
	changeEmail(next: string): Promise<boolean>;

	/** Drop this browser's session cookie. Everyone else's survives. */
	signOut(): Promise<void>;

	/**
	 * Sign out everywhere, immediately.
	 *
	 * Advances `sessions_valid_after` on the admin row to now, which kills
	 * every session issued before this moment — including the one calling it.
	 *
	 * **This is the server-side kill switch, and it is the only thing that
	 * works when it is needed.** The case it exists for is a phone in someone
	 * else's hands: a cookie jar we cannot reach, holding a session we cannot
	 * clear. Clearing a cookie asks that device to co-operate. This does not
	 * ask.
	 *
	 * It takes no argument because there is nothing to select — one admin, and
	 * everything before now.
	 */
	revoke(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Cookies
// ---------------------------------------------------------------------------

/**
 * Scoped to the dashboard path *(R12b)*, so the cookie is never attached to a
 * public page, an order page or the collection grid. Everything that needs it
 * — including every route handler the dashboard calls — lives under this path
 * for that reason.
 */
const COOKIE_PATH = "/dashboard";

const SESSION_COOKIE = "ubuntu_session";
const LINK_COOKIE = "ubuntu_link";

/** Thirty days, time-boxed *(R12b)*. A session that never dies survives a phone he sold. */
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** How long a redeemed link is worth anything. Long enough to type a password, and no longer. */
const LINK_TTL_MS = 10 * 60 * 1000;

/**
 * `Secure` unless we are demonstrably on plain http, which off the deployed
 * site means `pnpm preview` or a phone pointed at a laptop on the LAN.
 *
 * Named rather than hidden: a `Secure` cookie is silently dropped over http,
 * so hard-coding it true would make the whole login untestable anywhere except
 * production, and hard-coding it false would be a real weakening. The deployed
 * site is https end to end behind Cloudflare, so in production this is always
 * true.
 */
async function isSecureRequest(): Promise<boolean> {
	const header = await headers();
	const proto = header.get("x-forwarded-proto");
	if (proto) return proto.split(",")[0].trim() === "https";
	const host = header.get("host") ?? "";
	return !(host.startsWith("localhost") || host.startsWith("127.0.0.1") || /^\d/.test(host));
}

// ---------------------------------------------------------------------------
// The signed statement
// ---------------------------------------------------------------------------

/**
 * What a cookie says, before it is signed.
 *
 * Short keys because this is written to a cookie on every login and read on
 * every dashboard request; there is no other reason.
 */
interface Claim {
	/** admin row id */
	a: string;
	/** issued at, ms */
	i: number;
	/** expires at, ms */
	e: number;
	/** stage — a session, or a redeemed link waiting for its second factor */
	s: "session" | LinkPurpose;
}

function base64url(bytes: Uint8Array): string {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url(value: string): Uint8Array<ArrayBuffer> {
	const padded = value.replace(/-/g, "+").replace(/_/g, "/");
	const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
	// Allocated over a plain ArrayBuffer rather than `new Uint8Array(length)`,
	// which TypeScript widens to `ArrayBufferLike` and WebCrypto will not accept.
	const bytes = new Uint8Array(new ArrayBuffer(binary.length));
	for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
	return bytes;
}

async function signingKey(): Promise<CryptoKey> {
	const secret = await env("SESSION_SECRET");
	return crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign", "verify"],
	);
}

async function seal(claim: Claim): Promise<string> {
	const payload = base64url(new TextEncoder().encode(JSON.stringify(claim)));
	const signature = await crypto.subtle.sign(
		"HMAC",
		await signingKey(),
		new TextEncoder().encode(payload),
	);
	return `${payload}.${base64url(new Uint8Array(signature))}`;
}

/**
 * Verify a cookie and return what it claims, or `null`.
 *
 * Everything that can go wrong collapses to `null`: a bad signature, a
 * malformed payload, an expired claim, the wrong stage. There is nothing a
 * caller could do differently with the distinction and every branch that keeps
 * one is a branch that can be got wrong.
 */
async function unseal(value: string | undefined, stage: Claim["s"]): Promise<Claim | null> {
	if (!value) return null;
	const [payload, signature] = value.split(".");
	if (!payload || !signature) return null;

	try {
		const valid = await crypto.subtle.verify(
			"HMAC",
			await signingKey(),
			fromBase64url(signature),
			new TextEncoder().encode(payload),
		);
		if (!valid) return null;

		const claim = JSON.parse(new TextDecoder().decode(fromBase64url(payload))) as Claim;
		if (claim.s !== stage) return null;
		if (typeof claim.e !== "number" || claim.e < Date.now()) return null;
		if (typeof claim.a !== "string" || typeof claim.i !== "number") return null;
		return claim;
	} catch {
		return null;
	}
}

// ---------------------------------------------------------------------------
// Supabase, over HTTP
// ---------------------------------------------------------------------------

/**
 * Supabase is reached by `fetch` against its REST endpoints rather than through
 * `@supabase/supabase-js`.
 *
 * Three calls are needed in the whole application — mint a link, verify a link,
 * check a password — and the SDK is a dependency the 3 MiB worker budget would
 * be paying for three POSTs. `CLAUDE.md`'s rule is *prefer a hand-written 40
 * lines to a 200 KB package*, and this is the case it was written for.
 */
async function env(name: string): Promise<string> {
	const { getCloudflareContext } = await import("@opennextjs/cloudflare");
	const value = (getCloudflareContext().env as unknown as Record<string, string | undefined>)[
		name
	];
	if (!value) throw new UnconfiguredError(name);
	return value;
}

class UnconfiguredError extends Error {
	constructor(name: string) {
		super(`auth: ${name} is not set`);
	}
}

async function supabase(
	path: string,
	key: "anon" | "service",
	body: unknown,
): Promise<{ status: number; json: Record<string, unknown> }> {
	const url = await env("SUPABASE_URL");
	const apiKey = await env(
		key === "service" ? "SUPABASE_SERVICE_ROLE_KEY" : "SUPABASE_ANON_KEY",
	);

	const response = await fetch(`${url.replace(/\/$/, "")}${path}`, {
		method: "POST",
		headers: {
			apikey: apiKey,
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
	});

	// A non-JSON body from an auth endpoint means something upstream is wrong,
	// not that the credentials were bad. Either way nothing here is logged: a
	// GoTrue error can echo the address, and the response can carry a token.
	const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
	return { status: response.status, json };
}

// ---------------------------------------------------------------------------
// The admin row
// ---------------------------------------------------------------------------

async function adminRow() {
	const db = await getDb();
	const [row] = await db
		.select({
			id: schema.admin.id,
			email: schema.admin.email,
			sessionsValidAfter: schema.admin.sessionsValidAfter,
		})
		.from(schema.admin)
		.limit(1);
	return row ?? null;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/** Anything thrown by the provider or by a missing setting, mapped to a reason the UI can render. */
function failure(error: unknown): { ok: false; reason: LoginFailure } {
	if (error instanceof UnconfiguredError) return { ok: false, reason: "unconfigured" };
	return { ok: false, reason: "unavailable" };
}

export const auth: Auth = {
	async current(): Promise<Session | null> {
		const jar = await cookies();
		const claim = await unseal(jar.get(SESSION_COOKIE)?.value, "session");
		if (!claim) return null;

		// The third check, and the one the cookie cannot answer for itself. A
		// session issued before this timestamp is dead however valid its
		// signature is and however long it has left to run.
		const admin = await adminRow();
		if (!admin || admin.id !== claim.a) return null;
		if (claim.i < admin.sessionsValidAfter.getTime()) return null;

		return { adminId: claim.a, issuedAt: new Date(claim.i) };
	},

	async beginLogin(email, purpose = "login"): Promise<LoginResult<LoginLink>> {
		try {
			const admin = await adminRow();
			// An address that is not his gets the same answer a wrong password
			// gets, and no mail. There is one account; this endpoint is not a
			// place to discover which address it uses.
			if (!admin || admin.email.toLowerCase() !== email.trim().toLowerCase()) {
				return { ok: false, reason: "rejected" };
			}

			// `generate_link` mints the link without Supabase sending it, which is
			// what lets it travel on our own rail, in our own words, and skips the
			// built-in SMTP's rate limit. `hashed_token` is the half we can verify
			// server-side; `action_link` points back at Supabase and is discarded.
			const { status, json } = await supabase("/auth/v1/admin/generate_link", "service", {
				type: "magiclink",
				email: admin.email,
			});
			if (status >= 400) return { ok: false, reason: "rejected" };

			const hashed = json.hashed_token;
			if (typeof hashed !== "string") return { ok: false, reason: "unavailable" };

			const origin = await siteOrigin();
			const path =
				purpose === "reauth" ? "/dashboard/settings/verify" : "/dashboard/login/verify";
			return {
				ok: true,
				value: { to: admin.email, url: `${origin}${path}?t=${encodeURIComponent(hashed)}` },
			};
		} catch (error) {
			return failure(error);
		}
	},

	async completeLogin(tokenHash, password): Promise<LoginResult<Session>> {
		try {
			const admin = await adminRow();
			if (!admin) return { ok: false, reason: "rejected" };

			// The link. Verifying consumes it at Supabase, so a replayed URL
			// fails here even inside its own lifetime.
			const link = await supabase("/auth/v1/verify", "anon", {
				type: "magiclink",
				token_hash: tokenHash,
			});
			if (link.status >= 400) return { ok: false, reason: "rejected" };

			// The password — the factor his phone does not contain. Checked
			// against Supabase, which is where the credential lives; nothing
			// derived from it is stored here or written to the cookie.
			const secret = await supabase("/auth/v1/token?grant_type=password", "anon", {
				email: admin.email,
				password,
			});
			if (secret.status >= 400) return { ok: false, reason: "rejected" };

			// Both passed. Everything Supabase just issued is discarded: the
			// session below is ours, and it is the one `sessions_valid_after`
			// can reach.
			const now = Date.now();
			const jar = await cookies();
			jar.set(
				SESSION_COOKIE,
				await seal({ a: admin.id, i: now, e: now + SESSION_TTL_MS, s: "session" }),
				{
					httpOnly: true,
					secure: await isSecureRequest(),
					sameSite: "lax",
					path: COOKIE_PATH,
					maxAge: SESSION_TTL_MS / 1000,
				},
			);
			jar.delete({ name: LINK_COOKIE, path: COOKIE_PATH });

			return { ok: true, value: { adminId: admin.id, issuedAt: new Date(now) } };
		} catch (error) {
			return failure(error);
		}
	},

	async redeemReauth(tokenHash): Promise<LoginResult<true>> {
		try {
			const admin = await adminRow();
			if (!admin) return { ok: false, reason: "rejected" };

			const { status } = await supabase("/auth/v1/verify", "anon", {
				type: "magiclink",
				token_hash: tokenHash,
			});
			if (status >= 400) return { ok: false, reason: "rejected" };

			const now = Date.now();
			const jar = await cookies();
			jar.set(
				LINK_COOKIE,
				await seal({ a: admin.id, i: now, e: now + LINK_TTL_MS, s: "reauth" }),
				{
					httpOnly: true,
					secure: await isSecureRequest(),
					sameSite: "lax",
					path: COOKIE_PATH,
					maxAge: LINK_TTL_MS / 1000,
				},
			);

			return { ok: true, value: true };
		} catch (error) {
			return failure(error);
		}
	},

	async hasFreshLink(): Promise<boolean> {
		const jar = await cookies();
		const claim = await unseal(jar.get(LINK_COOKIE)?.value, "reauth");
		if (!claim) return false;
		const admin = await adminRow();
		return Boolean(admin && admin.id === claim.a);
	},

	async changeEmail(next): Promise<boolean> {
		const admin = await adminRow();
		if (!admin) return false;

		const db = await getDb();
		const [row] = await db
			.select({ authUserId: schema.admin.authUserId })
			.from(schema.admin)
			.where(eq(schema.admin.id, admin.id))
			.limit(1);

		if (row?.authUserId) {
			const { status } = await supabase(`/auth/v1/admin/users/${row.authUserId}`, "service", {
				email: next,
				email_confirm: true,
			});
			// If Supabase refuses, our row must not move either — otherwise the
			// address he types at the login screen and the address that holds the
			// password have quietly parted company.
			if (status >= 400) return false;
		}

		await db
			.update(schema.admin)
			.set({ email: next, updatedAt: new Date() })
			.where(eq(schema.admin.id, admin.id));

		return true;
	},

	async signOut(): Promise<void> {
		const jar = await cookies();
		jar.delete({ name: SESSION_COOKIE, path: COOKIE_PATH });
		jar.delete({ name: LINK_COOKIE, path: COOKIE_PATH });
	},

	async revoke(): Promise<void> {
		const db = await getDb();
		await db.update(schema.admin).set({ sessionsValidAfter: new Date(), updatedAt: new Date() });
		await auth.signOut();
	},
};

/**
 * The gate, as every dashboard screen uses it.
 *
 * A page or action calls this and either has a session or has been sent to the
 * login screen. Kept beside the adapter rather than in the layout so that a
 * server action — which does **not** re-run the layout — passes the same check
 * as the page that rendered its form.
 */
export async function requireSession(): Promise<Session> {
	const session = await auth.current();
	if (!session) redirect("/dashboard/login");
	return session;
}
