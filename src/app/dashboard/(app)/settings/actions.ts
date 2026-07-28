"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isMeasurementKey, toCanonical } from "@/content/measurements";
import { getDb, schema } from "@/db/client";
import { auth, requireSession } from "@/lib/auth";
import { email as mailer } from "@/lib/email";
import { signInEmail } from "@/emails/sign-in";

// Settings — the handful of numbers he turns, plus the two screens R16's FK and
// R9b's garment types made necessary.
//
// Everything here is a dashboard field by R9d's test: he would want to change it
// monthly, and changing it changes nothing about the design. Everything that
// fails that test — every fixed string, every email body, the fit diagrams, the
// measurement definitions — is code and is not on this screen.

async function gate() {
	await requireSession();
	return getDb();
}

const text = (form: FormData, field: string) => String(form.get(field) ?? "").trim();

function number(form: FormData, field: string): number | null {
	const raw = text(form, field);
	if (!raw) return null;
	const value = Number(raw.replace(/[^\d.-]/g, ""));
	return Number.isFinite(value) ? value : null;
}

// ---------------------------------------------------------------------------
// The globals
// ---------------------------------------------------------------------------

export async function saveGlobals(form: FormData): Promise<void> {
	const db = await gate();

	const replyTime = number(form, "replyTimeDays");

	await db
		.update(schema.settings)
		.set({
			// **One number he raises when busy, and every piece updates at once**
			// *(R4)*.
			queueOffsetDays: Math.trunc(number(form, "queueOffsetDays") ?? 0),
			// **What priority buys is a position in the queue, never speed.** The
			// model cannot express "we stitch it faster" — this moves, and a piece's
			// making days never do.
			priorityOffsetDays: Math.trunc(number(form, "priorityOffsetDays") ?? 0),
			priorityModifier: Math.trunc(number(form, "priorityModifier") ?? 0),
			// **An absolute figure, not a percentage** *(R6)*, and never called a
			// deposit. A commission has no total until the design exists.
			designFee: Math.trunc(number(form, "designFee") ?? 0),
			// **Null until he answers it.** A bracketed value in the copy is an
			// unanswered founder question, and the code that reads this renders the
			// bracket rather than a guess. Clearing the field puts it back to null,
			// which is a real state and not an empty one.
			replyTimeDays: replyTime === null ? null : Math.trunc(replyTime),
			collectionTheme: text(form, "collectionTheme") || null,
			updatedAt: new Date(),
		})
		.where(eq(schema.settings.id, 1));

	const rwTheme = text(form, "rwCollectionTheme");
	if (rwTheme) {
		await db
			.insert(schema.settingsTranslations)
			.values({ settingsId: 1, locale: "rw", collectionTheme: rwTheme })
			.onConflictDoUpdate({
				target: [schema.settingsTranslations.settingsId, schema.settingsTranslations.locale],
				set: { collectionTheme: rwTheme, updatedAt: new Date() },
			});
	}

	revalidatePath("/dashboard/settings");
}

// ---------------------------------------------------------------------------
// Makers — R16's FK, and the screen it needed
// ---------------------------------------------------------------------------

/**
 * **The maker is a table with an FK, not a typed string** *(R16)*.
 *
 * `ubuntu-foundation.md` §6 commits to makers being named and celebrated, with
 * faces on the story page. A typed name per order is a backfill of misspellings
 * on the day that page exists — *Jean-Claude*, *Jean Claude*, *JC*.
 *
 * This screen and the picker on the order are the cost R16 carried and did not
 * name; it is costed into Phase 2 rather than discovered inside it.
 */
export async function addMaker(form: FormData): Promise<void> {
	const db = await gate();
	const name = text(form, "name");
	if (!name) return;
	await db.insert(schema.makers).values({ name });
	revalidatePath("/dashboard/settings");
}

/**
 * Someone who has stopped working with him is **deactivated, never deleted** —
 * the orders they made still point here, and the story page still names them.
 */
export async function toggleMaker(form: FormData): Promise<void> {
	const db = await gate();
	const makerId = text(form, "makerId");
	const [maker] = await db
		.select({ active: schema.makers.active })
		.from(schema.makers)
		.where(eq(schema.makers.id, makerId))
		.limit(1);
	if (!maker) return;

	await db
		.update(schema.makers)
		.set({ active: !maker.active, updatedAt: new Date() })
		.where(eq(schema.makers.id, makerId));

	revalidatePath("/dashboard/settings");
}

// ---------------------------------------------------------------------------
// Garment types — a setting, not a section *(R9b)*
// ---------------------------------------------------------------------------

/**
 * A shape he cuts. Three rows set up once and untouched for months is the
 * definition of a setting, and top-level nav would make the dashboard look like
 * it is about garments when it is about orders.
 */
export async function saveGarmentType(form: FormData): Promise<void> {
	const db = await gate();
	const garmentTypeId = text(form, "garmentTypeId");

	const values = {
		key: text(form, "key"),
		name: text(form, "name"),
		audience: text(form, "audience") === "kids" ? ("kids" as const) : ("adult" as const),
		// **A reference, not a file bound to the type** *(R13c)*. One column
		// holding a key, so *kids 2–6* and *kids 7–12* point at one drawing rather
		// than two identical SVGs that drift the moment either is edited.
		diagramKey: text(form, "diagramKey") || text(form, "key"),
		// Kids types only. A three-year-old and a twelve-year-old differ by roughly
		// double on every measurement, so one kids band passes anything — and a
		// guardrail that never fires is worse than none, because it looks like a
		// check.
		ageMinYears: number(form, "ageMinYears") === null ? null : Math.trunc(number(form, "ageMinYears")!),
		ageMaxYears: number(form, "ageMaxYears") === null ? null : Math.trunc(number(form, "ageMaxYears")!),
		updatedAt: new Date(),
	};

	if (garmentTypeId) {
		await db
			.update(schema.garmentTypes)
			.set(values)
			.where(eq(schema.garmentTypes.id, garmentTypeId));
	} else {
		if (!values.key || !values.name) return;
		await db.insert(schema.garmentTypes).values(values);
	}

	revalidatePath("/dashboard/settings");
}

/**
 * One measurement on one garment type, with **the three guardrail bands in
 * force for it** *(R7)*.
 *
 * Two nested ranges, which is three bands: inside plausible passes silently;
 * outside plausible but inside impossible asks a gentle question that must be
 * acknowledged; outside impossible is the only hard stop. **A hard block on a
 * real body is the site telling someone their body is wrong**, so the bands are
 * evidence for adjudication rather than validation of the person.
 *
 * The values themselves are his call and are first on the homework list —
 * nobody who does not cut the cloth can answer it, which is exactly why they are
 * fields and not constants.
 *
 * Typed in centimetres and stored in millimetres, the same discipline as money.
 */
export async function saveMeasurement(form: FormData): Promise<void> {
	const db = await gate();
	const garmentTypeId = text(form, "garmentTypeId");
	const key = text(form, "measurementKey");

	// He picks from the code's list; he cannot invent a key with nowhere to
	// render on the drawing *(R7)*.
	if (!isMeasurementKey(key)) redirect("/dashboard/settings?e=measurement");

	const toStore = (field: string) => {
		const value = number(form, field);
		return value === null ? null : toCanonical(value, "cm", key);
	};

	const plausibleMin = toStore("plausibleMin");
	const plausibleMax = toStore("plausibleMax");
	const impossibleMin = toStore("impossibleMin");
	const impossibleMax = toStore("impossibleMax");

	if (
		plausibleMin === null ||
		plausibleMax === null ||
		impossibleMin === null ||
		impossibleMax === null
	) {
		redirect("/dashboard/settings?e=bands");
	}

	// The database carries the same rule. Entering them the wrong way round would
	// silently make every value impossible, which is the failure that looks most
	// like the form being broken and least like a number being wrong.
	if (
		!(
			impossibleMin <= plausibleMin &&
			plausibleMin <= plausibleMax &&
			plausibleMax <= impossibleMax
		)
	) {
		redirect("/dashboard/settings?e=nest");
	}

	await db
		.insert(schema.garmentTypeMeasurements)
		.values({
			garmentTypeId,
			measurementKey: key,
			position: Math.trunc(number(form, "position") ?? 0),
			required: form.get("required") === "on",
			plausibleMin,
			plausibleMax,
			impossibleMin,
			impossibleMax,
		})
		.onConflictDoUpdate({
			target: [
				schema.garmentTypeMeasurements.garmentTypeId,
				schema.garmentTypeMeasurements.measurementKey,
			],
			set: {
				position: Math.trunc(number(form, "position") ?? 0),
				required: form.get("required") === "on",
				plausibleMin,
				plausibleMax,
				impossibleMin,
				impossibleMax,
				updatedAt: new Date(),
			},
		});

	revalidatePath("/dashboard/settings");
}

export async function removeMeasurement(form: FormData): Promise<void> {
	const db = await gate();
	await db
		.delete(schema.garmentTypeMeasurements)
		.where(eq(schema.garmentTypeMeasurements.id, text(form, "id")));
	revalidatePath("/dashboard/settings");
}

// ---------------------------------------------------------------------------
// Ownership — the one place re-auth applies *(R12b)*
// ---------------------------------------------------------------------------

/**
 * Ask for the fresh link that an ownership change requires.
 *
 * **Re-auth defends ownership, not actions.** Changing the admin email or the
 * recovery address is the one move that converts temporary access into
 * permanent ownership. Confirming a price does not step up: it would fire on his
 * daily job, cost a mail round trip each time, and stop nobody already reading
 * his mail.
 */
export async function requestReauth(): Promise<void> {
	const session = await requireSession();
	const db = await getDb();

	const [admin] = await db
		.select({ email: schema.admin.email })
		.from(schema.admin)
		.where(eq(schema.admin.id, session.adminId))
		.limit(1);
	if (!admin) redirect("/dashboard/settings");

	const link = await auth.beginLogin(admin.email, "reauth");
	if (!link.ok) redirect("/dashboard/settings?e=link");

	try {
		await mailer.send(signInEmail(link.value.to, link.value.url));
	} catch {
		redirect("/dashboard/settings?e=link");
	}

	redirect("/dashboard/settings?sent=1");
}

/**
 * Change the login address or the recovery address.
 *
 * **Refuses without a link redeemed in the last ten minutes.** This is the whole
 * of the re-auth rule, and it is enforced here rather than by hiding the form.
 */
export async function saveOwnership(form: FormData): Promise<void> {
	const session = await requireSession();
	const db = await getDb();

	if (!(await auth.hasFreshLink())) redirect("/dashboard/settings?e=stale");

	const email = text(form, "email");
	const recoveryEmail = text(form, "recoveryEmail");

	// The address is held in two places — Supabase, which has the password, and
	// our row, which has the revocation clock. The adapter moves both or neither.
	if (email) {
		const moved = await auth.changeEmail(email);
		if (!moved) redirect("/dashboard/settings?e=email");
	}

	await db
		.update(schema.admin)
		.set({ recoveryEmail: recoveryEmail || null, updatedAt: new Date() })
		.where(eq(schema.admin.id, session.adminId));

	revalidatePath("/dashboard/settings");
	redirect("/dashboard/settings?saved=1");
}
