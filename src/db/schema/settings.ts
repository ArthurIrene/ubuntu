// The handful of numbers he turns, and the one line of theme copy.
//
// Everything here is a dashboard field by R9d's test: he would want to change
// it monthly, and changing it changes nothing about the design. Everything that
// fails that test — every fixed string, every email body, the fit diagrams, the
// measurement definitions — is code and is not in this table.

import { sql } from "drizzle-orm";
import { check, integer, pgTable, primaryKey, text } from "drizzle-orm/pg-core";

import { currency, money, updatedAt } from "./columns";
import { locale } from "./enums";

/**
 * **One row.** The globals.
 *
 * A single typed row rather than a key/value table: the set is fixed and small,
 * and typed columns mean a number cannot be saved as the string `"seven"`. The
 * `id = 1` check is what keeps it single.
 */
export const settings = pgTable(
	"settings",
	{
		/** Always 1. See the check below. */
		id: integer("id").primaryKey().default(1),

		currency: currency(),

		/**
		 * **One number he raises when busy, and every piece updates at once**
		 * *(R4)*.
		 *
		 * Timeframes are typed, not calculated. Calculated needs queue depth and a
		 * capacity figure that do not exist yet, and with fewer than ten orders he
		 * knows better than any formula. The customer sees a piece's making days
		 * plus this.
		 */
		queueOffsetDays: integer("queue_offset_days").notNull().default(0),

		/**
		 * What priority buys: **a position in the queue, never speed** *(R4)*.
		 *
		 * The model cannot express "we stitch it faster" — priority moves this
		 * offset and never a piece's making days. The promise is enforced by
		 * schema rather than by discipline.
		 *
		 * **The priority option renders only while `queueOffsetDays` is
		 * non-zero.** With an empty queue there is no position to buy, and
		 * offering one on a site with four pieces and no orders would be the first
		 * piece of scarcity copy on it. The modifier and the offset both exist
		 * from day one; the option does not appear.
		 */
		priorityOffsetDays: integer("priority_offset_days").notNull().default(0),

		/** What priority costs, as an ordinary modifier *(R3)*. */
		priorityModifier: money("priority_modifier").notNull().default(0),

		/**
		 * The commission design fee — **an absolute figure, not a percentage**
		 * *(R6)*.
		 *
		 * A commission has no total until the design exists, so a percentage is
		 * arithmetically impossible. Global default here, overridable per
		 * commission on the order's schedule. Credited against the total, and it
		 * must sit comfortably below the cheapest thing he would make.
		 *
		 * **Never called a deposit.**
		 */
		designFee: money("design_fee").notNull().default(0),

		/**
		 * The number that fills `[X]` in the submission state, the *In design*
		 * line and the emails.
		 *
		 * **Null until he answers it.** A bracketed value in the copy is an
		 * unanswered founder question and must not ship as an invented number, so
		 * this has no default — the code that reads it renders the bracket rather
		 * than a guess.
		 *
		 * Note that the *few days* beneath the commission button is deliberately
		 * qualitative and does **not** read this field. Reply time is qualitative
		 * there and numeric everywhere else.
		 */
		replyTimeDays: integer("reply_time_days"),

		/** English canonical. The line that frames the collection page. */
		collectionTheme: text("collection_theme"),

		updatedAt: updatedAt(),
	},
	(table) => [check("settings_is_singleton", sql`${table.id} = 1`)],
);

/** Kinyarwanda for the collection theme. Falls back to English silently. */
export const settingsTranslations = pgTable(
	"settings_translations",
	{
		settingsId: integer("settings_id")
			.notNull()
			.references(() => settings.id, { onDelete: "cascade" }),
		locale: locale("locale").notNull(),
		collectionTheme: text("collection_theme"),
		updatedAt: updatedAt(),
	},
	(table) => [primaryKey({ columns: [table.settingsId, table.locale] })],
);
