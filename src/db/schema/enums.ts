// Every enum the schema uses, in one file.
//
// These are real Postgres enum types, not text columns with a convention. A
// convention is enforced by whoever remembers it; a type is enforced by the
// database. Several decisions in `docs/ubuntu-decisions.md` were taken
// specifically so that the data model *cannot* express the wrong thing — the
// priority option that can never shorten making days, the piece kind that can
// never be listed publicly — and a text column would hand all of that back.
//
// Adding a value to a Postgres enum is `ALTER TYPE ... ADD VALUE`, which is
// additive and cheap. Removing one is not. So a value goes in here only when a
// decision round has named it.

import { pgEnum } from "drizzle-orm/pg-core";

/**
 * The two locales. English is canonical and unprefixed; Kinyarwanda is at
 * `/rw`, built and walkable but `noindex` and unlinked until the flip bar
 * clears *(R14)*.
 *
 * French and Swahili were named and dismissed permanently, which is why this
 * is an enum and not an IETF language tag column.
 */
export const locale = pgEnum("locale", ["en", "rw"]);

/**
 * How the customer asked to be contacted *(R11)*.
 *
 * **The email fires either way.** This chooses whether a WhatsApp draft is a
 * required row in the Today queue or an optional one beside it — it never
 * decides whether the email goes, because the email is the permanent address
 * of the order token and a chat thread is not durable storage.
 */
export const preferredChannel = pgEnum("preferred_channel", ["email", "whatsapp"]);

/**
 * Collection or commission, on both the piece and the order *(R6)*.
 *
 * A collection order is a commission with one payment gate — the same
 * machinery, pointed at a piece that already exists. On the piece this is also
 * a guard: **a commission-kind piece can never be listed publicly or enter the
 * window display**, which R6 wanted as schema rather than as discipline.
 */
export const pieceKind = pgEnum("piece_kind", ["collection", "commission"]);

/**
 * Draft on create, live when published, removed when taken down *(R9b)*.
 *
 * `removed` and `draft` look identical to the public and are different facts —
 * one has never been seen, the other has. The dashboard shows the difference;
 * the public query (`kind = 'collection' AND state = 'live'`) does not care.
 */
export const pieceState = pgEnum("piece_state", ["draft", "live", "removed"]);

/**
 * Which question an option answers on a piece *(R1, R2)*.
 *
 * **There is no gender here and there will not be.** What changes the making is
 * the cut, not the customer, so `cut` is an option like any other: a piece with
 * one cut asks no question, and nobody classifies themselves to buy a hat.
 */
export const optionGroup = pgEnum("option_group", ["colourway", "cut", "size"]);

/**
 * What a line in an order's price snapshot is.
 *
 * The snapshot is base, every modifier and the final figure *(R3)* — so that
 * *"why 51,000?"* is answered by the record rather than by his memory.
 * `adjustment` is R9c's price change at confirmation, which carries a required
 * reason and appears as its own named line rather than silently moving the
 * base.
 */
export const priceLineKind = pgEnum("price_line_kind", [
	"base",
	"option",
	"priority",
	"shipping",
	"adjustment",
]);

/**
 * What kind of money movement a row records *(R16)*.
 *
 * A refund is its own typed row, never a payment with a negative amount that a
 * reader has to infer — the first query that forgets the convention reports a
 * refund as income. `correction` fixes a recording mistake: money entered
 * wrong, not money that moved.
 *
 * Mirrors `PaymentType` in `src/lib/payments.ts`.
 */
export const paymentType = pgEnum("payment_type", ["payment", "refund", "correction"]);

/**
 * How the money was recorded.
 *
 * `manual` is a permanent capability, not a temporary one — it is what still
 * works when a gateway is down. When a gateway lands its webhook writes this
 * same table with `gateway`, and nothing else in the model moves.
 *
 * Mirrors `PaymentMethod` in `src/lib/payments.ts`.
 */
export const paymentMethod = pgEnum("payment_method", ["manual", "gateway"]);

/**
 * Which moment in a commission's payment schedule a row answers to *(R6)*.
 *
 * A commission has no total until the design is agreed, so it is paid in
 * three: the design fee before he drafts, a payment to start cutting once the
 * design is agreed, and the balance on completion.
 *
 * Nullable wherever it appears. A collection order's schedule has a single
 * entry with no other gate to distinguish it from, and labelling it with a
 * commission's vocabulary would make every gate-filtered query read as though
 * that order had a design step it never had.
 *
 * Mirrors `PaymentGate` in `src/lib/payments.ts`.
 */
export const paymentGate = pgEnum("payment_gate", ["design_fee", "cutting", "balance"]);

/**
 * Who took the measurements, which is what decides liability *(R7, R13a)*.
 *
 * - `self` — the customer measured themselves.
 * - `guardian` — the customer measured **someone else**: a gift, or a child.
 *   Added by R13a because R7's enum assumed the person ordering is the person
 *   measured. Reusing `self` was rejected: it gets liability right and the
 *   record wrong, and adjudication is the fit record's entire job.
 * - `tailor` — a tailor measured them; theirs.
 * - `standard` — a size off the chart; theirs, but he checks it against height
 *   and weight before anything is cut.
 * - `ours` — measured at a physical point by us. Fully his, no negotiation.
 *   One enum value and no build: the whole of R16's drop-in reservation.
 *
 * **`guardian` is not a child record.** A child is never an entity here — no
 * name, no date of birth, no row *(R13a)*. This value plus an age in years on
 * the fit record is the entire footprint, deliberately.
 */
export const fitSource = pgEnum("fit_source", ["self", "guardian", "tailor", "standard", "ours"]);

/**
 * The unit the customer actually typed *(R7)*.
 *
 * Values are stored canonically — see `fitMeasurements.value` — and this
 * records what was in front of them, because a number recalled to someone who
 * typed inches should come back as inches. Reserved for the diaspora; `cm` is
 * the only value in use at launch.
 */
export const measurementUnit = pgEnum("measurement_unit", ["cm", "in"]);

/**
 * Which body a garment type is cut for *(R1's filter taxonomy, R13c's bands)*.
 *
 * The taxonomy is in the schema from day one; the filter bar waits until the
 * catalogue earns it, at roughly 15–20 pieces. A filter above four items makes
 * a small brand look like an empty shop.
 */
export const garmentAudience = pgEnum("garment_audience", ["adult", "kids"]);

/**
 * What a private image attached to an order is.
 *
 * Both live in the private bucket and are streamed through the Worker with the
 * order token checked — **never served from the public bucket** *(R8)*.
 * `customer_reference` unlocks on the order page in Phase 8, after he accepts;
 * it is never an anonymous upload box on a public form.
 */
export const orderImageKind = pgEnum("order_image_kind", ["progress", "customer_reference"]);

/**
 * Who caused an event *(R4)*.
 *
 * `system` is the automated rail — a send that fired, a bounce that came back.
 * There is no `admin` beside `founder` because there is one account.
 */
export const eventActor = pgEnum("event_actor", ["founder", "customer", "system"]);

/**
 * Every fact an order can record.
 *
 * **The log is the truth and status is derived from it** *(R4)*. There is no
 * status column anywhere in this schema, deliberately: a status field
 * overwrites, and retrofitting a log means reconstructing history that was
 * never recorded.
 *
 * **No payment event appears here.** Paid-ness is a separate dimension, derived
 * from the payments table, so *awaiting balance* needs no state and no event
 * *(R4)*. The Today queue reads the log and the payments table together.
 *
 * `lapsed`, `declined` and `cancelled` are the three off-path endings. Lapsed
 * is operationally essential — without it every stranger who requests and
 * vanishes sits in Confirmed forever.
 */
export const orderEventType = pgEnum("order_event_type", [
	"requested",
	"confirmed",
	"declined",
	"design_shared",
	"design_agreed",
	"fit_recorded",
	"fit_checked",
	"price_adjusted",
	"making_started",
	"making_complete",
	"shipped",
	"delivered",
	"lapsed",
	"cancelled",
	"token_rotated",
	"message_sent",
	"message_failed",
]);
