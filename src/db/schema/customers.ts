// The customer row.
//
// **Customers have no accounts** *(R5)*. An order is reached by the token in
// its path and by nothing else; this row exists so that the dashboard can one
// day say *"this is her third piece"*, which for a brand named Abantu is not a
// nicety. It has no customer-facing surface at launch and no section in the
// dashboard — R9b cut the section and kept the row, and every FK still
// resolves.

import { sql } from "drizzle-orm";
import { check, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { createdAt, id, updatedAt } from "./columns";
import { locale } from "./enums";

/**
 * A person who has asked for a piece.
 *
 * **Keyed on phone.** Email is the automated rail and the permanent address of
 * the order token; phone is delivery, alteration, and his own hand — and it is
 * the one that identifies, which is why Phase 8's accounts are *phone
 * identifies, email authenticates*: SMS and WhatsApp OTP both cost money.
 *
 * ## Every identity column here is nullable, and that is the point
 *
 * A data subject can ask to be forgotten, and R1 requires past orders to always
 * resolve. Those are only compatible if **erasure anonymises the person while
 * the order survives** *(R16)*. So `redacted_at` is set, name, phone, email and
 * address are cleared, and the order keeps what proves it happened — piece,
 * money, dates, event log.
 *
 * Retrofitting this would mean writing a migration during a request that is
 * already legally running. It is here from the first migration for that reason
 * alone.
 *
 * **Erasure does not stop at this table.** The fit record attached to their
 * orders redacts with them — see `fitRecords.redactedAt`, which is the sharpest
 * thing the pre-build review found and the reason Law 058/2021 exists.
 */
export const customers = pgTable(
	"customers",
	{
		id: id(),

		/**
		 * The identifier. Nullable **only so erasure can clear it** — a live
		 * customer always has one, because the order form requires it.
		 *
		 * Unique, and Postgres permits many nulls in a unique index, which is
		 * exactly the behaviour redaction needs: any number of redacted rows
		 * coexist without colliding.
		 */
		phone: text("phone").unique(),

		/**
		 * Required on every order *(R5)* and nullable here for the same reason as
		 * `phone`. This is where every order email goes, whatever channel they
		 * chose.
		 */
		email: text("email"),

		/** What he calls them. Clears on erasure. */
		name: text("name"),

		/**
		 * Where a finished piece is posted. Clears on erasure.
		 *
		 * One address on the customer rather than one per order: he is shipping
		 * single garments to people he has spoken to, and a second address is a
		 * conversation, not a form field. It also gives erasure one place to
		 * reach instead of a table to walk.
		 */
		address: text("address"),

		/**
		 * Set at creation and read by every email *(R14)*.
		 *
		 * One column now; impossible to reconstruct later. The order carries its
		 * own copy — see `orders.locale` — because an order's emails should not
		 * change language if the person's preference does.
		 */
		locale: locale("locale").notNull().default("en"),

		/**
		 * The Supabase Auth user, once they claim the order. **Null today, on
		 * every row** *(R5)*.
		 *
		 * One of R16's nine reservations: a column that exists and is unused.
		 * Accounts land in Phase 8, guest-first — the order is created with no
		 * account and the confirmation invites the customer to claim it. **Magic
		 * link, not password**: a password store is the worst thing to own on a
		 * free tier.
		 *
		 * The token never dies. **An account is another door to the same page,
		 * never the only one.**
		 */
		authUserId: uuid("auth_user_id").unique(),

		/** When they claimed it. Null on every row today, for the same reason. */
		claimedAt: timestamp("claimed_at", { withTimezone: true }),

		/**
		 * When they asked to be forgotten, and the flag every read must respect.
		 *
		 * Set once; the identity columns above are cleared in the same
		 * transaction, along with the measured values and age on every fit record
		 * reachable from their orders.
		 */
		redactedAt: timestamp("redacted_at", { withTimezone: true }),

		createdAt: createdAt(),
		updatedAt: updatedAt(),
	},
	(table) => [
		// Erasure is all-or-nothing. A row marked redacted that still holds a
		// phone number is the failure this whole shape exists to prevent, and it
		// is the kind of failure that happens when a request is handled by hand
		// under time pressure — which is exactly when a data request is handled.
		check(
			"customers_redaction_is_complete",
			sql`redacted_at IS NULL OR (name IS NULL AND phone IS NULL AND email IS NULL AND address IS NULL)`,
		),
	],
);
