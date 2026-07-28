// The one account, and the people who do the work.
//
// Two very small tables that sit outside the order model and are referenced by
// it: the single admin row the dashboard gate reads on every request, and the
// makers list R16 turned from a typed string into an entity.

import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { createdAt, id, position, updatedAt } from "./columns";

/**
 * The founder's account. **One row.**
 *
 * There is no role column, no permissions table and no second user, because
 * there is one login and everything behind it is his. Adding either would be
 * building a team feature for a solo brand.
 *
 * Supabase Auth holds the credentials — password *and* magic link, both, at
 * every login *(R12b)*. This row holds what Supabase cannot: the revocation
 * clock.
 */
export const admin = pgTable("admin", {
	id: id(),

	/**
	 * The Supabase Auth user this row belongs to.
	 *
	 * Nullable so the schema can be migrated before the auth user exists —
	 * Phase 1 lays the table, Phase 2 opens the auth shell that fills it.
	 */
	authUserId: uuid("auth_user_id").unique(),

	/**
	 * The login address.
	 *
	 * **Not the address printed on the site** *(R12a)*. That mailbox is the root
	 * of trust under every option considered, including the password ones, so
	 * it carries 2FA and it is not the one strangers write to.
	 */
	email: text("email").notNull().unique(),

	/**
	 * Where account recovery goes, if it is not the login address.
	 *
	 * Changing this — or `email` — is the one move that converts temporary
	 * access into permanent ownership, so it is the one action that demands a
	 * fresh magic link. **Re-auth defends ownership, not actions** *(R12b)*:
	 * confirming a price does not step up, because it would fire on his daily
	 * job and stop nobody already reading his mail.
	 */
	recoveryEmail: text("recovery_email"),

	/**
	 * The kill switch, and the thirty-day box.
	 *
	 * Every dashboard request compares the session's issue time against this
	 * column; a session issued before it is dead however valid its token still
	 * looks. That is what makes *sign out everywhere* instant *(R12c)*.
	 *
	 * **It exists because Supabase's own sign-out has a gap.** Revoking the
	 * refresh token does nothing to an access token already issued — that one is
	 * stateless and stays valid until it expires, which is why JWT expiry is
	 * also shortened to ~15 minutes in the project settings. The case both
	 * answer is a phone in someone else's hands: a cookie jar we cannot reach,
	 * holding a token with a quarter of an hour left to run. Clearing a cookie
	 * asks that device to co-operate. This does not ask.
	 *
	 * It is also what makes R12b's thirty-day session a real boundary rather
	 * than a client-side setting nobody enforces.
	 */
	sessionsValidAfter: timestamp("sessions_valid_after", { withTimezone: true })
		.notNull()
		.defaultNow(),

	createdAt: createdAt(),
	updatedAt: updatedAt(),
});

/**
 * The people who stitch. **A table with an FK from the order, not a string on
 * it** *(R16)*.
 *
 * `ubuntu-foundation.md` §6 commits to makers being named and celebrated, with
 * faces on the story page. A typed name per order is a backfill of
 * misspellings on the day that page exists — *Jean-Claude*, *Jean Claude*,
 * *JC* — and it is one table now against a data-cleaning job later.
 *
 * One row to start. The dashboard surface it needs — a list in Settings and a
 * picker on the order — is costed into Phase 2 rather than discovered inside
 * it.
 *
 * Faces, bios and past work are Phase 8, when the story page is built. This
 * table carries only what the order needs to point at.
 */
export const makers = pgTable("makers", {
	id: id(),

	/** As he would write it on the story page. */
	name: text("name").notNull(),

	/**
	 * Whether the maker appears in the picker on new orders.
	 *
	 * Someone who has stopped working with him is deactivated, never deleted —
	 * the orders they made still point here, and the story page still names
	 * them.
	 */
	active: boolean("active").notNull().default(true),

	position: position(),
	createdAt: createdAt(),
	updatedAt: updatedAt(),
});
