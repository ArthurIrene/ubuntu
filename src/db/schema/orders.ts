// The order, and everything that hangs off it.
//
// **There is no status column in this file.** An order is an append-only event
// log and status is derived from it *(R4)* — that is what gives the customer
// page, the audit trail, and the guarantee that nothing is silently
// overwritten. Retrofitting a log means reconstructing history that was never
// recorded.
//
// **Paid-ness is a second dimension, derived from the payments table.** No
// payment state clutters the journey, and *awaiting balance* needs no state at
// all.

import { sql } from "drizzle-orm";
import {
	boolean,
	check,
	index,
	integer,
	pgTable,
	real,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { createdAt, currency, id, money, position, updatedAt } from "./columns";
import { makers } from "./admin";
import { pieces } from "./catalogue";
import { customers } from "./customers";
import {
	eventActor,
	locale,
	orderEventType,
	orderImageKind,
	paymentGate,
	paymentMethod,
	paymentType,
	pieceKind,
	preferredChannel,
	priceLineKind,
} from "./enums";

/**
 * An order. **One object for both kinds** *(R6)*.
 *
 * A commission is the existing machinery pointed at a piece that does not exist
 * yet, and in a line: *a collection order is a commission with one gate.*
 */
export const orders = pgTable(
	"orders",
	{
		id: id(),

		/**
		 * The 128-bit token in the path — `/o/<token>` *(R5)*.
		 *
		 * **Never a query string, never a sequential id.** Short enough to paste
		 * into a message without looking like phishing.
		 *
		 * **Stored raw, and that survived R12's security round with its reasoning
		 * recorded so it does not return.** Hashing is not a trade-off here but an
		 * incompatibility: a hash cannot be reversed into a link, so re-sending
		 * would have to issue a *new* token on every status change — killing the
		 * customer's bookmarked copy and contradicting *no expiry, ever*.
		 *
		 * **No expiry.** The alteration window runs from Delivered, past orders
		 * must always resolve, and a dead link is the site forgetting someone.
		 * Rotatable in one click for the customer who forwarded it to the wrong
		 * person — one at a time, never in bulk.
		 *
		 * **Never logged**, never in an error report, and the analytics beacon is
		 * not rendered on order routes: the path *is* the credential, so page-view
		 * analytics would file every live token in a table. **The dashboard never
		 * renders it either** *(R12d)* — no field, no list, no link. The one
		 * exception is the WhatsApp draft, which must carry it, so a session
		 * yields one token per deliberate action rather than a table.
		 */
		token: text("token").notNull().unique(),

		kind: pieceKind("kind").notNull().default("collection"),

		customerId: uuid("customer_id")
			.notNull()
			.references(() => customers.id, { onDelete: "restrict" }),

		/**
		 * The piece being made. **Null only between Requested and design
		 * agreement, on a commission** *(R6)*.
		 *
		 * That window is the design, not a wart: the customer's page shows their
		 * own words back to them, no photo, no price. The emptiness is the
		 * product on the order page too. The piece is minted at design agreement,
		 * when making days become knowable and it enters the queue.
		 *
		 * `restrict`, which is R1's rule as schema: **hard delete only for a piece
		 * with zero orders.** The database refuses the rest.
		 */
		pieceId: uuid("piece_id").references(() => pieces.id, { onDelete: "restrict" }),

		/**
		 * Who stitched it *(R16)*. Chosen from the picker in Phase 2.
		 *
		 * `restrict`: a maker who has made something is deactivated, never
		 * deleted. The story page still names them.
		 */
		makerId: uuid("maker_id").references(() => makers.id, { onDelete: "restrict" }),

		/**
		 * Set at creation, read by every email *(R11, R14)*.
		 *
		 * The order's own copy rather than a join to the customer: the language
		 * an order was placed in is a fact about that order, and it should not
		 * change retroactively because the person later switched.
		 */
		locale: locale("locale").notNull().default("en"),

		/**
		 * Email or WhatsApp, chosen on the form *(R11)*.
		 *
		 * **The email always fires either way.** What this changes is the Today
		 * queue: choosing WhatsApp makes the hand-sent draft a *required* row that
		 * does not clear until he has sent it, rather than the optional one every
		 * emailing row already offers.
		 *
		 * The form says so rather than letting it be discovered — *we'll message
		 * you on WhatsApp, and email you a copy you can always come back to.*
		 */
		preferredChannel: preferredChannel("preferred_channel").notNull().default("email"),

		currency: currency(),

		/**
		 * The final figure he confirmed, snapshotted. Null until Confirmed.
		 *
		 * Stored rather than derived, unlike the payments total, because it is a
		 * **snapshot**: changing a price tomorrow must not rewrite what someone
		 * agreed to today. The lines that add up to it are in
		 * {@link orderPriceLines}.
		 */
		confirmedTotal: money("confirmed_total"),
		confirmedAt: timestamp("confirmed_at", { withTimezone: true }),

		/**
		 * The customer's own words on a commission request.
		 *
		 * Shown back to them on their order page during the design window, when
		 * there is nothing else to show. **Clears on erasure** along with the
		 * customer's identity columns — R16 lists what an order keeps, and it is
		 * piece, money, dates and events. Free text a stranger wrote about
		 * themselves is not on that list.
		 */
		brief: text("brief"),

		createdAt: createdAt(),
		updatedAt: updatedAt(),
	},
	(table) => [
		index("orders_customer_idx").on(table.customerId),
		index("orders_piece_idx").on(table.pieceId),
		index("orders_maker_idx").on(table.makerId),
		// A collection order is for a piece that already exists. Only a
		// commission may sit without one, and only until the design is agreed.
		check("orders_collection_has_piece", sql`kind <> 'collection' OR piece_id IS NOT NULL`),
	],
);

/**
 * One line of an order's price snapshot — base, each modifier, the final
 * figure *(R3)*.
 *
 * Snapshotted rather than recomputed, so that *"why 51,000?"* is answered by
 * the record rather than by his memory, however many times the piece has been
 * repriced since.
 */
export const orderPriceLines = pgTable(
	"order_price_lines",
	{
		id: id(),
		orderId: uuid("order_id")
			.notNull()
			.references(() => orders.id, { onDelete: "cascade" }),

		kind: priceLineKind("kind").notNull(),

		/** As it read on the day — *Indigo*, *Priority*, *Wider chest, extra cloth*. */
		label: text("label").notNull(),

		amount: money("amount").notNull(),

		/**
		 * **Required on an adjustment**, enforced below *(R9c)*.
		 *
		 * Price is adjustable at confirmation and the cases are real — cloth a
		 * wide measurement eats, a colourway he is short on, a discount he wants
		 * to give. An adjustment that explains itself inside the breakdown does
		 * not weaken *it is a price, not a starting price*; it is what answers
		 * *why 51,000?*
		 *
		 * Decline-and-re-ask was rejected: it throws away the request and asks a
		 * stranger to fill the form twice.
		 */
		reason: text("reason"),

		position: position(),
		createdAt: createdAt(),
	},
	(table) => [
		uniqueIndex("order_price_lines_position_idx").on(table.orderId, table.position),
		check(
			"order_price_lines_adjustment_has_reason",
			sql`kind <> 'adjustment' OR reason IS NOT NULL`,
		),
	],
);

/**
 * The order's payment schedule, snapshotted and ordered *(R6)*.
 *
 * **A collection order has exactly one entry.** A commission has three: the
 * design fee before he drafts, a payment to start cutting once the design is
 * agreed, and the balance on completion before it ships.
 *
 * The design fee is an absolute figure, not a percentage — a commission has no
 * total until the design exists, so a percentage is arithmetically impossible.
 * It is credited against the total, which is arithmetic for the layer that
 * computes what is owed rather than a column here.
 */
export const orderPaymentSchedule = pgTable(
	"order_payment_schedule",
	{
		id: id(),
		orderId: uuid("order_id")
			.notNull()
			.references(() => orders.id, { onDelete: "cascade" }),

		position: position(),

		/**
		 * Which gate this entry is, where there is one to name.
		 *
		 * Null on a collection order's single entry: there is no other gate to
		 * distinguish it from, and labelling it `balance` would make every
		 * gate-filtered query read as though that order had a design step it
		 * never had.
		 */
		gate: paymentGate("gate"),

		/**
		 * What this gate asks for. **Null where it is not yet knowable** — the
		 * balance on a commission has no figure until the design is agreed.
		 */
		amount: money("amount"),
		currency: currency(),

		createdAt: createdAt(),
		updatedAt: updatedAt(),
	},
	(table) => [
		uniqueIndex("order_payment_schedule_position_idx").on(table.orderId, table.position),
	],
);

/**
 * Money that moved. **Its own table from day one** *(R3)*, which is what makes
 * deposits, refunds and corrections free later rather than a migration.
 *
 * Mirrors `PaymentRecord` in `src/lib/payments.ts`. The net paid on an order is
 * always **derived from these rows and never stored** — a stored total is a
 * second copy of the truth that drifts from the first.
 *
 * `restrict` on the order, so an order that has taken money cannot be deleted
 * out from under its ledger.
 */
export const payments = pgTable(
	"payments",
	{
		id: id(),
		orderId: uuid("order_id")
			.notNull()
			.references(() => orders.id, { onDelete: "restrict" }),

		amount: money("amount").notNull(),
		currency: currency(),

		/** payment · refund · correction *(R16)*. A refund is never a negative payment. */
		type: paymentType("type").notNull().default("payment"),

		/** manual · gateway. Both write this table; manual never goes away. */
		method: paymentMethod("method").notNull().default("manual"),

		/** Which gate it satisfies, where there is one to name. */
		gate: paymentGate("gate"),

		/**
		 * Set when the **customer** said they paid and he has not confirmed it
		 * yet *(R4)*.
		 *
		 * **A payment row awaiting his eye, never an order state.** It closes the
		 * silence between someone sending money and him noticing, without letting
		 * an unverified claim move the order forward. Money that has not been
		 * confirmed has not been received.
		 */
		reported: boolean("reported").notNull().default(false),

		/** When he confirmed it. A reported row is waiting until this is set. */
		confirmedAt: timestamp("confirmed_at", { withTimezone: true }),

		/** The mobile-money or transfer reference, as he was given it. */
		reference: text("reference"),

		createdAt: createdAt(),
		updatedAt: updatedAt(),
	},
	(table) => [index("payments_order_idx").on(table.orderId, table.createdAt)],
);

/**
 * One fact about an order, appended and never changed. **The log is the truth.**
 *
 * Each row carries a timestamp and an actor *(R4)*. Status is derived from
 * these; the Today queue's membership is derived from these plus the payments
 * table, gate-based rather than time-based, so there is nothing to configure and
 * no job to schedule *(R9a)*.
 *
 * There is no `updatedAt` and no delete path. The log is also already capturing
 * real durations, which is what makes calculated timeframes possible after
 * twenty or thirty orders with nothing extra to build.
 */
export const orderEvents = pgTable(
	"order_events",
	{
		id: id(),
		orderId: uuid("order_id")
			.notNull()
			.references(() => orders.id, { onDelete: "cascade" }),

		type: orderEventType("type").notNull(),
		actor: eventActor("actor").notNull(),

		/**
		 * One short line where the event needs one — which email key was sent,
		 * why a bounce came back.
		 *
		 * Deliberately a single text column and not a JSON blob. A blob becomes
		 * the place everything ends up, and then the log has a schema nobody
		 * wrote down. Anything that needs structure gets a column or a table:
		 * the price adjustment's reason is a named price line, the fit check is
		 * two columns on the fit record.
		 *
		 * **Never a token, never a measurement.**
		 */
		note: text("note"),

		/**
		 * When it happened, which is not always when it was recorded — he marks a
		 * package posted after he gets back from the post office.
		 */
		at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),

		createdAt: createdAt(),
	},
	(table) => [index("order_events_order_idx").on(table.orderId, table.at)],
);

/**
 * A private image attached to an order — a progress photo, or a customer's
 * reference image *(R8)*.
 *
 * **Private bucket, always.** Streamed through the Worker with the order token
 * checked, never served from the public bucket and never on the public
 * hostname. Progress photos get one derivative at 1000 px.
 */
export const orderImages = pgTable(
	"order_images",
	{
		id: id(),
		orderId: uuid("order_id")
			.notNull()
			.references(() => orders.id, { onDelete: "cascade" }),

		kind: orderImageKind("kind").notNull(),

		/** The key within the **private** bucket. */
		storageKey: text("storage_key").notNull().unique(),

		width: integer("width").notNull(),
		height: integer("height").notNull(),
		focalX: real("focal_x").notNull().default(0.5),
		focalY: real("focal_y").notNull().default(0.5),

		/** Optional here: a progress photo on a private page is captioned, not catalogued. */
		alt: text("alt"),

		position: position(),
		createdAt: createdAt(),
	},
	(table) => [
		index("order_images_order_idx").on(table.orderId, table.position),
		check(
			"order_images_focal_in_range",
			sql`focal_x >= 0 AND focal_x <= 1 AND focal_y >= 0 AND focal_y <= 1`,
		),
	],
);
