// The fit record: the most intimate thing in this database, and the one that
// has to survive a legal request intact-or-gone rather than partly.
//
// **Never in a message.** Not an email, not a WhatsApp draft, on either
// channel *(R7, R11)*. Measurements live behind the order token and nowhere
// else.

import { sql } from "drizzle-orm";
import {
	boolean,
	check,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { createdAt, id, position } from "./columns";
import { admin } from "./admin";
import { garmentTypes } from "./catalogue";
import { fitSource, measurementUnit } from "./enums";
import { orders } from "./orders";

/**
 * One set of numbers, taken once, for one order.
 *
 * ## Self-contained on purpose
 *
 * It snapshots the values, the labels, the instruction text that was shown, the
 * ranges that were in force and the size-chart version *(R7)*. *Our own stated
 * measurements* means the ones stated **on the day** — without a version, the
 * policy's three-way liability clause cannot be adjudicated at all.
 *
 * ## Append, never overwrite
 *
 * A second set of numbers after a request is a **new record**, and the event
 * log says which was in force when making started. There is no `updatedAt` here
 * for that reason.
 *
 * ## It redacts with the customer
 *
 * This is the sharpest thing the pre-build review found, and it is a decision
 * rather than a column *(R16)*.
 *
 * R13a made a child not an entity — no name, no date of birth, no row — so a
 * child's measurements live **here**, on the fit record attached to the
 * parent's order. `redacted_at` on the customer touches none of that on its
 * own. **A child's measurements surviving a parent's erasure request is the
 * precise failure Law 058/2021 exists to prevent, and there is no child row to
 * delete instead.**
 *
 * So: measured values and age-at-order clear when the customer is redacted.
 * What survives is what proves the order happened — piece, money, dates, event
 * log — plus the labels, instructions and ranges here, which are facts about
 * the form and not about the person.
 *
 * *The named cost: a redacted fit record can no longer adjudicate a fit
 * dispute. That is correct, because the person asking to be forgotten is the
 * person the record protected.*
 */
export const fitRecords = pgTable(
	"fit_records",
	{
		id: id(),

		/** `restrict`: the liability record outlives everything but erasure. */
		orderId: uuid("order_id")
			.notNull()
			.references(() => orders.id, { onDelete: "restrict" }),

		/**
		 * Which shape these numbers are for, and therefore which measurement list
		 * and which bands were in force.
		 *
		 * On a commission this arrives when the design is agreed — same form, same
		 * guardrails — and the piece may not exist yet, which is why it points at
		 * the type rather than through the piece.
		 */
		garmentTypeId: uuid("garment_type_id")
			.notNull()
			.references(() => garmentTypes.id, { onDelete: "restrict" }),

		/**
		 * Who took the measurements. **This is what decides liability** *(R7,
		 * R13a)*, which is why it is a recorded fact and not an inference.
		 *
		 * `guardian` is the customer measuring someone else — a gift, or a child.
		 * Reusing `self` for that case was rejected: it gets liability right and
		 * the record wrong, and adjudication is this record's entire job.
		 */
		source: fitSource("source").notNull(),

		/**
		 * The unit the customer typed in *(R7)*.
		 *
		 * Values are stored canonically — see {@link fitMeasurements.value} — and
		 * this is what lets a number be read back to someone in the unit they gave
		 * it. Reserved for the diaspora; `cm` at launch.
		 */
		unit: measurementUnit("unit").notNull().default("cm"),

		/**
		 * Which version of our stated measurements was on the page.
		 *
		 * The policy distributes liability three ways against *our own stated
		 * measurements*, and that phrase is meaningless without a version. It is a
		 * string rather than an FK because the chart itself is code.
		 */
		sizeChartVersion: text("size_chart_version").notNull(),

		/**
		 * The size chosen, when `source` is `standard`.
		 *
		 * Standard sizing is a real choice and not a fallback — *he checks every
		 * order himself against your height and weight before anything is cut* —
		 * so height and weight are recorded as ordinary measurement rows beside
		 * it, and redact with them.
		 */
		standardSize: text("standard_size"),

		/**
		 * **Age at the time of the order, in years. Never a date of birth**
		 * *(R13a)*.
		 *
		 * A birth date ages by itself and identifies; a number does neither. It is
		 * what the garment type's age band is read against, and it is what lets
		 * R9c's fit check show how old a kids order's measurements are.
		 *
		 * Null on an adult order. **Clears on erasure**, with the values.
		 */
		ageYears: integer("age_years"),

		/**
		 * The fit check, and who signed it *(R9c)*.
		 *
		 * **Required before *In the making*, unconditionally** — not raised only
		 * on odd numbers. A conditional tick means he must learn which cases raise
		 * it, and the case it would not raise is the plausible-but-wrong number
		 * that sails through. Cloth is cut at the second gate, so a wrong
		 * measurement found after it is unrecoverable.
		 *
		 * This is also the missing half of R7's liability record, which captured
		 * what the customer acknowledged and nothing about him. *The cost, named:
		 * a tick on every order risks becoming reflexive.*
		 */
		checkedAt: timestamp("checked_at", { withTimezone: true }),
		checkedBy: uuid("checked_by").references(() => admin.id, { onDelete: "restrict" }),

		/**
		 * When the values and the age were cleared, following the customer's
		 * erasure. Set in the same transaction as `customers.redacted_at`.
		 */
		redactedAt: timestamp("redacted_at", { withTimezone: true }),

		createdAt: createdAt(),
	},
	(table) => [
		index("fit_records_order_idx").on(table.orderId, table.createdAt),
		// A fit check is a signature: both halves or neither.
		check(
			"fit_records_check_is_signed",
			sql`(checked_at IS NULL) = (checked_by IS NULL)`,
		),
		// Erasure reaches the age here. The values themselves are one table down
		// and carry the matching constraint.
		check("fit_records_redaction_clears_age", sql`redacted_at IS NULL OR age_years IS NULL`),
	],
);

/**
 * One measurement on one fit record, with everything that was on screen beside
 * it.
 *
 * The label, the instruction and the bands are copied in rather than joined to
 * the garment type, because the garment type is a live dashboard row and this
 * has to say what the customer actually saw. He can widen a guardrail tomorrow
 * without changing what was in force today.
 */
export const fitMeasurements = pgTable(
	"fit_measurements",
	{
		id: id(),
		fitRecordId: uuid("fit_record_id")
			.notNull()
			.references(() => fitRecords.id, { onDelete: "cascade" }),

		/** The key its definition uses in code, and its anchor on the drawing. */
		measurementKey: text("measurement_key").notNull(),

		/**
		 * The number, in the canonical unit its definition declares —
		 * **millimetres for every length**, grams for a weight *(R7)*.
		 *
		 * Integers, the same discipline as money: a body measurement that has
		 * been through a float is a body measurement that can come back different.
		 * The unit the customer typed is on the record above; this is what was
		 * stored.
		 *
		 * **Nullable, and that is what makes erasure possible.** On redaction this
		 * clears and every column around it survives — because the label, the
		 * instruction and the ranges are facts about the form, and only this is a
		 * fact about a body.
		 */
		value: integer("value"),

		/** The label as it read on the form that day. */
		label: text("label").notNull(),

		/**
		 * The how-to-measure sentence that shipped **beside the field**, at the
		 * moment of entry — never in a tooltip *(R7)*.
		 *
		 * Snapshotted because it is what the policy's shared-liability clause
		 * turns on. If we later word it better, the record still shows what this
		 * person was told.
		 */
		instruction: text("instruction").notNull(),

		/** The bands in force when this number was typed. See `garmentTypeMeasurements`. */
		plausibleMin: integer("plausible_min"),
		plausibleMax: integer("plausible_max"),
		impossibleMin: integer("impossible_min"),
		impossibleMax: integer("impossible_max"),

		/** Whether the soft guardrail fired — the value fell outside plausible. */
		warned: boolean("warned").notNull().default(false),

		/**
		 * When they acknowledged the question the guardrail asked.
		 *
		 * **The acknowledgement is recorded, not just accepted** *(R7)*. The bands
		 * are evidence, and an unacknowledged warning and an acknowledged one are
		 * different facts in a dispute.
		 */
		acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),

		position: position(),
		createdAt: createdAt(),
	},
	(table) => [
		uniqueIndex("fit_measurements_key_idx").on(table.fitRecordId, table.measurementKey),
		// An acknowledgement with no warning behind it is a record of something
		// that did not happen.
		check(
			"fit_measurements_ack_needs_warning",
			sql`acknowledged_at IS NULL OR warned`,
		),
	],
);
