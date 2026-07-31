// Creating an order. **The first thing on this site that writes a stranger's
// data**, and the reason this phase has a discipline of its own.
//
// Three rules bound every line below:
//
// 1. **Append-only, never a status field** *(R4)*. The order is created and a
//    `requested` event is appended. Nothing here writes a state, because there
//    is no state column to write — status is derived in `order-state.ts`.
// 2. **The token is the credential** *(R5)*. Minted here, returned to exactly
//    one caller so it can redirect the person who just typed their name, and
//    never logged, never carried into an error.
// 3. **Nothing the customer posts is trusted to name a row.** The piece is
//    resolved from its slug under the public predicate, and the options are
//    resolved from the piece — so a hand-edited form cannot order a draft, a
//    commission-kind piece, or an option he has switched off.
//
// It is not a server action. Actions are the thin edge in `src/app/`; the
// writing lives here so that both forms create the same object and the rules
// are in one file rather than two.

import { and, eq, inArray } from "drizzle-orm";

import { RANGES_VERSION } from "@/content/measurements";
import { getDb, schema } from "@/db/client";
import { ageAtOrder, evaluateFit, fitSource, type FitRow } from "@/lib/fit";
import type { Locale } from "@/lib/locale";
import { sendOrderEmail } from "@/lib/notify";
import { mintToken } from "@/lib/token";

/**
 * Why a request was refused, as a key the page turns into a sentence.
 *
 * Keys rather than messages: **every string a customer reads is in
 * `src/content/`** *(R14)*, including this one, or the Kinyarwanda tree quietly
 * answers in English at the worst possible moment.
 */
export type OrderError =
	| "name"
	| "email"
	| "phone"
	| "scene"
	| "piece"
	| "channel"
	/** A number outside the impossible band, or missing, or unreadable *(R7)*. */
	| "fit"
	// The honeypot caught it. The page says the same thing as any other refusal
	// — a bot is told nothing it can learn from, and the vanishingly rare human
	// who fills a hidden field gets a real error rather than silence.
	| "unknown";

export interface OrderContact {
	name: string;
	email: string;
	phone: string;
	locale: Locale;
	preferredChannel: "email" | "whatsapp";
}

/**
 * A refusal, or the token of the order that now exists.
 *
 * A fit refusal also names the fields it is about, so the form can put the
 * sentence beside the input rather than only at the top. **The keys travel, the
 * numbers do not** — a measurement never goes into a URL *(R7, R11)*.
 */
export type OrderResult =
	| { ok: true; token: string }
	| { ok: false; error: OrderError; fields?: string[] };

/**
 * The fit half of an order, as the form posts it *(R7)*.
 *
 * Optional throughout: a garment type with no measurement list configured asks
 * nothing, and the numbers are settled with him afterwards — a real path, not a
 * stub.
 */
export interface FitInput {
	path: "measurements" | "size";
	/** self · guardian · tailor. **Never `ours`** — see `fitSource`. */
	who: string;
	/** Years, as a number. Kids garment types only. Never a date of birth. */
	age: string;
	/** The size they chose, on the standard path. */
	size: string;
	/** Keyed by measurement key, in the unit that was on screen. */
	typed: Record<string, string>;
}

// ---------------------------------------------------------------------------
// What a stranger typed, checked
// ---------------------------------------------------------------------------

/**
 * Enough of an email to send to, and no more.
 *
 * **Deliberately loose.** A stricter pattern rejects real addresses — plus
 * tags, new TLDs, non-ASCII local parts — and the cost of a wrong rejection is
 * a customer who cannot order at all, against a bad address that becomes a
 * bounce and therefore a row in his queue *(R11)*. The rail already handles the
 * second failure; nothing handles the first.
 */
function looksLikeEmail(value: string): boolean {
	return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(value) && value.length <= 254;
}

/**
 * Enough of a phone number to reach someone.
 *
 * **Email and phone are both required** *(R5)*: email is the automated rail and
 * the permanent address of the token, phone is delivery, alteration and his own
 * hand. Seven digits is the shortest thing that could be a phone number
 * anywhere; a Rwandan mobile is nine after the country code, and a diaspora
 * customer's is whatever it is.
 */
function looksLikePhone(value: string): boolean {
	const digits = value.replace(/\D/g, "");
	return digits.length >= 7 && digits.length <= 15;
}

function checkContact(contact: OrderContact): OrderError | null {
	if (!contact.name.trim()) return "name";
	if (!looksLikeEmail(contact.email.trim())) return "email";
	if (!looksLikePhone(contact.phone)) return "phone";
	return null;
}

// ---------------------------------------------------------------------------
// The customer row
// ---------------------------------------------------------------------------

/**
 * The person, found or made. **Keyed on phone** *(R5)*.
 *
 * A returning customer is the same row, which is what buys *"this is her third
 * piece"* on the day the order screen wants it. Their name and email are
 * refreshed from what they just typed, because the newer answer is the better
 * one and a changed address is how a bounce gets fixed.
 *
 * **A redacted row is never reused.** Someone who asked to be forgotten and
 * comes back is a new person to us: writing their name back onto the row they
 * had erased would undo the erasure with an INSERT nobody reviewed *(R16)*. The
 * unique index permits it — Postgres allows many nulls — because redaction
 * clears the phone number, so the lookup below simply does not find them.
 */
async function customerFor(
	db: Awaited<ReturnType<typeof getDb>>,
	contact: OrderContact,
): Promise<string> {
	const phone = contact.phone.trim();
	const email = contact.email.trim();
	const name = contact.name.trim();

	const [existing] = await db
		.select({ id: schema.customers.id })
		.from(schema.customers)
		.where(eq(schema.customers.phone, phone))
		.limit(1);

	if (existing) {
		await db
			.update(schema.customers)
			.set({ email, name, locale: contact.locale, updatedAt: new Date() })
			.where(eq(schema.customers.id, existing.id));
		return existing.id;
	}

	const [created] = await db
		.insert(schema.customers)
		.values({ phone, email, name, locale: contact.locale })
		.returning({ id: schema.customers.id });
	return created.id;
}

// ---------------------------------------------------------------------------
// A piece from the collection
// ---------------------------------------------------------------------------

export interface CollectionRequest extends OrderContact {
	/** The slug in the path. **Never a posted id** — see the note at the top. */
	slug: string;
	/** The option keys they chose, by group. Resolved against the piece. */
	options: { group: "colourway" | "cut" | "size"; key: string }[];
	/**
	 * **Position in the queue, never speed** *(R4)*.
	 *
	 * Honoured only while the global queue offset is non-zero — with an empty
	 * line there is no position to sell, and the page does not offer it. Checked
	 * here as well as hidden there, because a hidden field is a suggestion.
	 */
	priority: boolean;
	/** The fit fork's answers, where the garment type asked anything *(R7)*. */
	fit?: FitInput;
}

/**
 * One order for a piece that already exists.
 *
 * **A collection order is a commission with one gate** *(R6)*, and that is
 * literally what is written below: the same row, the same event, one entry in
 * the schedule instead of three.
 */
export async function createCollectionOrder(request: CollectionRequest): Promise<OrderResult> {
	const invalid = checkContact(request);
	if (invalid) return { ok: false, error: invalid };

	const db = await getDb();

	// **The one public predicate** *(R9b)* — `kind = collection AND state = live`.
	// A draft, a removed piece and a commission-kind piece are all the same
	// absence here as on the page that linked to this form.
	const [piece] = await db
		.select({
			id: schema.pieces.id,
			basePrice: schema.pieces.basePrice,
			currency: schema.pieces.currency,
			name: schema.pieces.name,
			garmentTypeId: schema.pieces.garmentTypeId,
		})
		.from(schema.pieces)
		.where(
			and(
				eq(schema.pieces.slug, request.slug),
				eq(schema.pieces.kind, "collection"),
				eq(schema.pieces.state, "live"),
			),
		)
		.limit(1);

	if (!piece) return { ok: false, error: "piece" };

	// The options as *he* holds them, not as they were posted. An option that is
	// switched off is not orderable, and the label and the modifier come off the
	// row rather than out of the request.
	const keys = request.options.map((option) => option.key).filter(Boolean);
	const chosen = keys.length
		? await db
				.select({
					group: schema.pieceOptions.group,
					key: schema.pieceOptions.key,
					label: schema.pieceOptions.label,
					priceModifier: schema.pieceOptions.priceModifier,
					position: schema.pieceOptions.position,
				})
				.from(schema.pieceOptions)
				.where(
					and(
						eq(schema.pieceOptions.pieceId, piece.id),
						eq(schema.pieceOptions.available, true),
						inArray(schema.pieceOptions.key, keys),
					),
				)
		: [];

	// Only the ones they actually asked for, in his order on the page.
	const wanted = chosen
		.filter((option) => request.options.some((o) => o.group === option.group && o.key === option.key))
		.sort((a, b) => a.position - b.position);

	const settings = await siteNumbers(db);
	// The option is not offered while the line is empty, and it is not honoured
	// either. Two checks for one rule, because only this one is a write.
	const priority = request.priority && settings.queueOffsetDays > 0;

	/*
	 * **The numbers are checked before anything is written** *(R7)*.
	 *
	 * An impossible value refuses the whole order rather than creating one with a
	 * fit record missing the number that was wrong — a record with a hole in it
	 * reads as though the question was never asked, and adjudication is the
	 * record's entire job.
	 *
	 * The bands come from `garment_type_measurements`, which is his to set. An
	 * empty list asks nothing and refuses nothing: the order is created with no
	 * fit record and he settles the numbers by hand, which is a path R7 already
	 * describes and not a stub.
	 */
	const fit = await prepareFit(db, piece.garmentTypeId, request.fit);
	if (fit && !fit.ok) return { ok: false, error: "fit", fields: fit.fields };

	const customerId = await customerFor(db, request);

	const [order] = await db
		.insert(schema.orders)
		.values({
			token: mintToken(),
			kind: "collection",
			customerId,
			pieceId: piece.id,
			currency: piece.currency,
			locale: request.locale,
			preferredChannel: request.preferredChannel,
		})
		.returning({ id: schema.orders.id, token: schema.orders.token });

	/*
	 * The price snapshot: **base, every modifier, and the figure he confirms**
	 * *(R3)*. What is written now is what the customer was shown; the final line
	 * is his and lands at confirmation.
	 *
	 * Snapshotted rather than joined, so that repricing the piece tomorrow cannot
	 * rewrite what someone asked for today — which is the whole reason these are
	 * rows and not a query.
	 */
	await db.insert(schema.orderPriceLines).values([
		{
			orderId: order.id,
			kind: "base" as const,
			label: piece.name,
			amount: piece.basePrice ?? 0,
			position: 0,
		},
		...wanted.map((option, index) => ({
			orderId: order.id,
			kind: "option" as const,
			label: option.label,
			amount: option.priceModifier,
			position: index + 1,
		})),
		...(priority
			? [
					{
						orderId: order.id,
						kind: "priority" as const,
						label: "Priority",
						amount: settings.priorityModifier,
						position: wanted.length + 1,
					},
				]
			: []),
	]);

	/*
	 * **One entry, and no gate name** *(R6)*. There is no other gate to
	 * distinguish it from, and labelling it `balance` would make every
	 * gate-filtered query read as though this order had a design step it never
	 * had.
	 *
	 * The amount is null, because it is not knowable yet: *he confirms your final
	 * price*, and until he has, nothing is owed. `openGate` and `settledBy` both
	 * read a null-amount gate as *not yet due*, so the order sits in Requested
	 * with nothing outstanding — which is exactly what the page says.
	 */
	await db
		.insert(schema.orderPaymentSchedule)
		.values([{ orderId: order.id, gate: null, amount: null, currency: piece.currency, position: 0 }]);

	if (fit && fit.ok) await writeFit(db, order.id, piece.garmentTypeId, fit);

	await announce(db, order.id, "customer");

	return { ok: true, token: order.token };
}

// ---------------------------------------------------------------------------
// The fit record
// ---------------------------------------------------------------------------

type PreparedFit =
	| { ok: false; fields: string[] }
	| {
			ok: true;
			source: "self" | "guardian" | "tailor" | "standard";
			unit: "cm" | "in";
			standardSize: string | null;
			ageYears: number | null;
			rows: FitRow[];
	  };

/**
 * Check the numbers against the bands that are in force, without writing.
 *
 * Returns null when the garment type asks for nothing — which is not a failure
 * and not a refusal. There is no fit record, the order is created anyway, and
 * the fit check still stands in front of the cloth being cut *(R9c)*.
 */
async function prepareFit(
	db: Awaited<ReturnType<typeof getDb>>,
	garmentTypeId: string,
	input: FitInput | undefined,
): Promise<PreparedFit | null> {
	if (!input) return null;

	const specs = await db
		.select({
			measurementKey: schema.garmentTypeMeasurements.measurementKey,
			required: schema.garmentTypeMeasurements.required,
			position: schema.garmentTypeMeasurements.position,
			plausibleMin: schema.garmentTypeMeasurements.plausibleMin,
			plausibleMax: schema.garmentTypeMeasurements.plausibleMax,
			impossibleMin: schema.garmentTypeMeasurements.impossibleMin,
			impossibleMax: schema.garmentTypeMeasurements.impossibleMax,
		})
		.from(schema.garmentTypeMeasurements)
		.where(eq(schema.garmentTypeMeasurements.garmentTypeId, garmentTypeId));

	if (specs.length === 0) return null;

	// **A size is `standard` by definition** *(R7)* — it is not a measurement
	// anybody took. Height and weight still come with it, because *he checks
	// every order himself against your height and weight before anything is
	// cut*, and that sentence is on the public page.
	const wanted =
		input.path === "size"
			? specs.filter((spec) => spec.measurementKey === "height" || spec.measurementKey === "weight")
			: specs;

	const outcome = evaluateFit({ specs: wanted, typed: input.typed, unit: "cm" });
	if (!outcome.ok) {
		// **The keys travel; the numbers do not.** The form names the fields it is
		// asking about again, and a measurement never reaches a URL.
		return { ok: false, fields: outcome.refusals.map((refusal) => refusal.key) };
	}

	return {
		ok: true,
		source: fitSource(input.path, input.who),
		unit: "cm",
		standardSize: input.path === "size" ? input.size || null : null,
		ageYears: ageAtOrder(input.age),
		rows: outcome.rows,
	};
}

/**
 * Write the record and its measurements.
 *
 * **Self-contained** *(R7)*: the values, the labels, the instruction text that
 * was shown, and **the literal band values that were in force**. A dispute is
 * settled by reading this record, never by looking a version up in a table that
 * may since have been edited — which is why the numbers below are copied in and
 * not joined to.
 */
async function writeFit(
	db: Awaited<ReturnType<typeof getDb>>,
	orderId: string,
	garmentTypeId: string,
	fit: Extract<PreparedFit, { ok: true }>,
): Promise<void> {
	const [record] = await db
		.insert(schema.fitRecords)
		.values({
			orderId,
			garmentTypeId,
			source: fit.source,
			unit: fit.unit,
			// The grouping label, not the evidence. Starts at 1; the
			// increment-on-band-edit machinery is Phase 5's.
			sizeChartVersion: String(RANGES_VERSION),
			standardSize: fit.standardSize,
			// **Age at the time of the order, in years, and never a date of birth**
			// *(R13a)*. A child is never an entity: no name, no row, and this number
			// plus `source = guardian` is the entire footprint.
			ageYears: fit.ageYears,
		})
		.returning({ id: schema.fitRecords.id });

	if (fit.rows.length > 0) {
		await db.insert(schema.fitMeasurements).values(
			fit.rows.map((row) => ({
				fitRecordId: record.id,
				measurementKey: row.measurementKey,
				value: row.value,
				label: row.label,
				instruction: row.instruction,
				plausibleMin: row.plausibleMin,
				plausibleMax: row.plausibleMax,
				impossibleMin: row.impossibleMin,
				impossibleMax: row.impossibleMax,
				warned: row.warned,
				// **Unacknowledged on arrival, always.** The question is asked on
				// their own order page, where the number is already behind the
				// credential — and the acknowledgement is a separate deliberate act
				// rather than a tick in the same breath as the number.
				acknowledgedAt: null,
				position: row.position,
			})),
		);
	}

	await db.insert(schema.orderEvents).values({
		orderId,
		type: "fit_recorded",
		// **They took the numbers, so they are the actor** *(R7)* — the log says
		// who, and that is different from the row he types in himself.
		actor: "customer",
	});
}

// ---------------------------------------------------------------------------
// A commission
// ---------------------------------------------------------------------------

export interface CommissionRequest extends OrderContact {
	/** Their scene, in their own words. The only required answer here. */
	scene: string;
	/** Which garment they imagine it on, or that they are not sure. */
	garment: string;
	/** Anything else he should know. */
	anythingElse: string;
	/** The labels the form put beside those three, in the locale they read. */
	labels: { scene: string; garment: string; anythingElse: string };
}

/**
 * A commission: **the same machinery pointed at a piece that does not exist
 * yet** *(R6)*.
 *
 * `piece_id` stays null from here until the design is agreed, and that window is
 * the design rather than a wart — their order page shows their own words back to
 * them, no photo, no price. **The emptiness is the product.**
 *
 * No measurements are asked for and none are stored. Fit arrives on the order
 * page when the design is agreed, same form and same guardrails *(R7)* — asking
 * sleeve length beside someone's grandmother's story would break the spell, and
 * there is nothing yet to cut.
 */
export async function createCommissionOrder(request: CommissionRequest): Promise<OrderResult> {
	const invalid = checkContact(request);
	if (invalid) return { ok: false, error: invalid };
	if (!request.scene.trim()) return { ok: false, error: "scene" };

	const db = await getDb();
	const settings = await siteNumbers(db);
	const customerId = await customerFor(db, request);

	/*
	 * Their three answers, kept as one passage of their own words — labelled the
	 * way the form labelled them, in the language they were reading.
	 *
	 * One column rather than three, because this is prose and not data: it is
	 * shown back to them on their order page during the design window, and read
	 * by him in the design panel. **It clears on erasure** with the identity
	 * columns *(R16)* — free text a stranger wrote about themselves is not on the
	 * list of what an order keeps.
	 */
	const brief = [
		request.scene.trim(),
		request.garment.trim() ? `${request.labels.garment}: ${request.garment.trim()}` : null,
		request.anythingElse.trim()
			? `${request.labels.anythingElse}: ${request.anythingElse.trim()}`
			: null,
	]
		.filter((part): part is string => Boolean(part))
		.join("\n\n");

	const [order] = await db
		.insert(schema.orders)
		.values({
			token: mintToken(),
			kind: "commission",
			customerId,
			// Null until the design is agreed. The check constraint permits it here
			// and forbids it on a collection order.
			pieceId: null,
			locale: request.locale,
			preferredChannel: request.preferredChannel,
			brief,
		})
		.returning({ id: schema.orders.id, token: schema.orders.token });

	/*
	 * **Three gates, in the order they fall due** *(R6)*: the design fee before
	 * he drafts, a payment when the design is agreed and the cloth is cut, the
	 * balance on completion.
	 *
	 * Only the first can carry a figure. A commission has no total until the
	 * design exists, which is also why the fee is an absolute amount and never a
	 * percentage — a percentage of an unknown number is not arithmetic.
	 *
	 * **Zero is unanswered, not free.** The column defaults to zero because a
	 * money column must default to something, and a commission that begins for
	 * nothing is not a decision he has taken — so it snapshots as null and the
	 * page renders `[X]` until he answers.
	 */
	await db.insert(schema.orderPaymentSchedule).values([
		{
			orderId: order.id,
			gate: "design_fee" as const,
			amount: settings.designFee && settings.designFee > 0 ? settings.designFee : null,
			position: 0,
		},
		{ orderId: order.id, gate: "cutting" as const, amount: null, position: 1 },
		{ orderId: order.id, gate: "balance" as const, amount: null, position: 2 },
	]);

	await announce(db, order.id, "customer");

	return { ok: true, token: order.token };
}

// ---------------------------------------------------------------------------
// The two things that happen to every new order
// ---------------------------------------------------------------------------

/** The numbers he turns, read once per creation. */
async function siteNumbers(db: Awaited<ReturnType<typeof getDb>>) {
	const [row] = await db
		.select({
			designFee: schema.settings.designFee,
			queueOffsetDays: schema.settings.queueOffsetDays,
			priorityModifier: schema.settings.priorityModifier,
		})
		.from(schema.settings)
		.where(eq(schema.settings.id, 1))
		.limit(1);

	return {
		designFee: row?.designFee ?? null,
		queueOffsetDays: row?.queueOffsetDays ?? 0,
		priorityModifier: row?.priorityModifier ?? 0,
	};
}

/**
 * The first event, and the first of the nine emails.
 *
 * **The event is appended before the mail is attempted, and the mail cannot
 * undo it.** `sendOrderEmail` returns a boolean and does not throw *(notify.ts)*
 * precisely so that a dead rail cannot roll back an order a person believes they
 * placed. An order advances whether or not the message went; a message that did
 * not go becomes a row in his queue, which is a problem with a hand attached to
 * it.
 *
 * The actor is `customer`, because they are the one who did it. That is the
 * difference between this and the order he takes himself in the dashboard, and
 * it is the sort of fact an append-only log exists to keep.
 */
async function announce(
	db: Awaited<ReturnType<typeof getDb>>,
	orderId: string,
	actor: "customer" | "founder",
): Promise<void> {
	await db.insert(schema.orderEvents).values({ orderId, type: "requested", actor });

	// The one that carries the link. It names no figure — there is no price until
	// he confirms one, and `[X]` is honest where an invented number is not.
	await sendOrderEmail(orderId, "order_created", { amount: null });
}
