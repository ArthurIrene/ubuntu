"use server";

import { and, count, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDb, schema } from "@/db/client";
import { isDuplicate } from "@/db/errors";
import { requireSession } from "@/lib/auth";
import { DERIVATIVES, derivativeKey } from "@/lib/image-loader";
import { storage } from "@/lib/storage";

// Pieces — **`draft → live → removed`** *(R9b)*.
//
// Draft on create, because Phase 2 puts the dashboard in his hands before the
// public site exists: he will be entering pieces for weeks with photos missing
// and stories half-written, and without draft, launch day means hunting for the
// unfinished ones.
//
// **Removed and draft look identical to the public and are different facts.**
// One has never been seen; the other has. The difference shows here.

async function gate() {
	await requireSession();
	return getDb();
}

const text = (form: FormData, field: string) => String(form.get(field) ?? "").trim();

function number(form: FormData, field: string): number | null {
	const raw = text(form, field);
	if (!raw) return null;
	const value = Number(raw.replace(/[^\d-]/g, ""));
	return Number.isFinite(value) ? Math.trunc(value) : null;
}

function id(form: FormData, field = "pieceId"): string {
	const value = form.get(field);
	if (typeof value !== "string" || !value) throw new Error(`missing ${field}`);
	return value;
}

// `pieces.slug` is UNIQUE and the slug is derived from the name, so the second
// *Summer* he starts is not a rare case — it is the ordinary one, and until now
// it was a raw 500 on the screen where he does his content. See
// `src/db/errors.ts` for why exactly one error is caught and nothing else is.

/** A slug that is a URL segment and stays one. */
function slugify(value: string): string {
	return (
		value
			.toLowerCase()
			.normalize("NFD")
			.replace(/[̀-ͯ]/g, "")
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 60) || `piece-${Date.now()}`
	);
}

/** **Draft on create** — nothing leaks while he works. */
export async function createPiece(form: FormData): Promise<void> {
	const db = await gate();
	const name = text(form, "name") || "Untitled";
	const kind = text(form, "kind") === "commission" ? "commission" : "collection";

	let created: { id: string } | undefined;
	try {
		[created] = await db
			.insert(schema.pieces)
			.values({
				slug: slugify(name),
				name,
				kind,
				garmentTypeId: text(form, "garmentTypeId"),
				state: "draft",
			})
			.returning({ id: schema.pieces.id });
	} catch (error) {
		// The name slugged to one that is taken. **No slug is invented to get
		// around it** — no `-2` suffix, no timestamp: the address of a piece on the
		// site is his to choose, and a silently mangled one is worse than being
		// asked. He renames, or he opens the piece that already has it.
		if (isDuplicate(error)) {
			redirect(`/dashboard/pieces?e=slug${kind === "commission" ? "&kind=commission" : ""}`);
		}
		throw error;
	}

	redirect(`/dashboard/pieces/${created.id}`);
}

export async function savePiece(form: FormData): Promise<void> {
	const db = await gate();
	const pieceId = id(form);

	try {
		await db
			.update(schema.pieces)
			.set({
				name: text(form, "name"),
				slug: text(form, "slug") || slugify(text(form, "name")),
				sceneLine: text(form, "sceneLine") || null,
				story: text(form, "story") || null,
				basePrice: number(form, "basePrice"),
				makingDays: number(form, "makingDays"),
				garmentTypeId: text(form, "garmentTypeId"),
				// **One boolean, and the entire schema cost of Ubuntu for Nature**
				// *(R17)*. It drives no separate query, no separate route, no second
				// grid — resist making it more than this.
				reborn: form.get("reborn") === "on",
				updatedAt: new Date(),
			})
			.where(eq(schema.pieces.id, pieceId));
	} catch (error) {
		// Another piece's slug, typed into the field. He is sent back to this
		// piece: the rest of what he typed is not saved, and the screen he lands on
		// is the one that shows what is still stored.
		if (isDuplicate(error)) redirect(`/dashboard/pieces/${pieceId}?e=slug`);
		throw error;
	}

	// Kinyarwanda, per-entity rows with a fallback chain *(R14)*. Adding a locale
	// is inserting rows, never altering tables — and a missing story falls back
	// to English silently, so he is never blocked from publishing.
	const rwName = text(form, "rwName");
	const rwSceneLine = text(form, "rwSceneLine");
	const rwStory = text(form, "rwStory");

	if (rwName || rwSceneLine || rwStory) {
		await db
			.insert(schema.pieceTranslations)
			.values({
				pieceId,
				locale: "rw",
				name: rwName || null,
				sceneLine: rwSceneLine || null,
				story: rwStory || null,
			})
			.onConflictDoUpdate({
				target: [schema.pieceTranslations.pieceId, schema.pieceTranslations.locale],
				set: {
					name: rwName || null,
					sceneLine: rwSceneLine || null,
					story: rwStory || null,
					updatedAt: new Date(),
				},
			});
	}

	revalidatePath(`/dashboard/pieces/${pieceId}`);
}

/**
 * **Publish is deliberate and enforces a floor** — photo, price, scene line,
 * alt text *(R9b)*, plus making days, which joined the floor in Phase 2 because
 * the customer's timeframe is making days plus the queue offset and a live piece
 * without one shows nothing where a delivery estimate belongs.
 *
 * The database carries the half of this a column can see. Photo and alt text
 * need a join, so they are checked here — and the message he reads is a
 * sentence rather than a constraint violation.
 */
export async function publishPiece(form: FormData): Promise<void> {
	const db = await gate();
	const pieceId = id(form);

	const [piece] = await db
		.select()
		.from(schema.pieces)
		.where(eq(schema.pieces.id, pieceId))
		.limit(1);
	if (!piece) redirect("/dashboard/pieces");

	const photos = await db
		.select({ alt: schema.pieceImages.alt })
		.from(schema.pieceImages)
		.where(eq(schema.pieceImages.pieceId, pieceId));

	const missing: string[] = [];
	if (!piece.sceneLine) missing.push("a scene line");
	if (piece.basePrice === null) missing.push("a price");
	if (piece.makingDays === null) missing.push("making days");
	if (photos.length === 0) missing.push("a photograph");
	// The column is NOT NULL and the upload route defaults it to the scene line,
	// so the failure this catches is an alt that was emptied afterwards rather
	// than one that was never set.
	if (photos.some((photo) => photo.alt.trim() === "")) {
		missing.push("alt text on every photograph");
	}

	if (missing.length > 0) {
		redirect(`/dashboard/pieces/${pieceId}?missing=${encodeURIComponent(missing.join(", "))}`);
	}

	await db
		.update(schema.pieces)
		.set({
			state: "live",
			// Set once, on first publish. **Sorted from day one** *(R10)* — the
			// collection page is newest-first and is the permanent answer to
			// "what's new". Re-publishing a piece he brought back does not make it
			// new again.
			publishedAt: piece.publishedAt ?? new Date(),
			updatedAt: new Date(),
		})
		.where(eq(schema.pieces.id, pieceId));

	revalidatePath(`/dashboard/pieces/${pieceId}`);
	revalidatePath("/dashboard/pieces");
}

/** Take it down. **Reversible in one click** *(R1)* — he will bring pieces back. */
export async function setState(form: FormData): Promise<void> {
	const db = await gate();
	const pieceId = id(form);
	const state = text(form, "state");
	if (state !== "draft" && state !== "live" && state !== "removed") return;

	await db
		.update(schema.pieces)
		.set({ state, updatedAt: new Date() })
		.where(eq(schema.pieces.id, pieceId));

	// A removed piece cannot sit in the window display, which is a live shelf.
	if (state !== "live") {
		await db.delete(schema.windowDisplay).where(eq(schema.windowDisplay.pieceId, pieceId));
	}

	revalidatePath(`/dashboard/pieces/${pieceId}`);
	revalidatePath("/dashboard/pieces");
}

/**
 * **Hard delete only for a piece with zero orders** *(R1)* — wrong photo,
 * duplicate, typo. Same button, behaviour decided by the data rather than by him
 * remembering a rule.
 *
 * The foreign key is `restrict`, so the database would refuse anyway. This
 * checks first so that what he reads is a sentence.
 */
export async function deletePiece(form: FormData): Promise<void> {
	const db = await gate();
	const pieceId = id(form);

	const [orders] = await db
		.select({ total: count() })
		.from(schema.orders)
		.where(eq(schema.orders.pieceId, pieceId));

	if ((orders?.total ?? 0) > 0) {
		redirect(`/dashboard/pieces/${pieceId}?e=orders`);
	}

	// The files go with it. Nothing points at them any more, and an orphaned
	// object is a bill on a metered store.
	const images = await db
		.select({ storageKey: schema.pieceImages.storageKey })
		.from(schema.pieceImages)
		.where(eq(schema.pieceImages.pieceId, pieceId));

	for (const image of images) {
		for (const width of DERIVATIVES) {
			await storage.delete("public", derivativeKey(image.storageKey, width));
		}
	}

	await db.delete(schema.pieces).where(eq(schema.pieces.id, pieceId));
	redirect("/dashboard/pieces");
}

// ---------------------------------------------------------------------------
// Photographs
// ---------------------------------------------------------------------------

/**
 * Where to hold the crop.
 *
 * **Cards crop 4:5 with `object-fit: cover`, and this is what stops that crop
 * beheading people** *(R8)*.
 */
export async function setFocalPoint(form: FormData): Promise<void> {
	const db = await gate();
	const pieceId = id(form);
	const imageId = text(form, "imageId");

	const clamp = (value: number) => Math.min(1, Math.max(0, value));

	await db
		.update(schema.pieceImages)
		.set({
			focalX: clamp(Number(text(form, "focalX")) || 0.5),
			focalY: clamp(Number(text(form, "focalY")) || 0.5),
			alt: text(form, "alt") || "A piece by Ubuntu",
			updatedAt: new Date(),
		})
		.where(eq(schema.pieceImages.id, imageId));

	revalidatePath(`/dashboard/pieces/${pieceId}`);
}

export async function deleteImage(form: FormData): Promise<void> {
	const db = await gate();
	const pieceId = id(form);
	const imageId = text(form, "imageId");

	const [image] = await db
		.delete(schema.pieceImages)
		.where(eq(schema.pieceImages.id, imageId))
		.returning({ storageKey: schema.pieceImages.storageKey });

	if (image) {
		for (const width of DERIVATIVES) {
			await storage.delete("public", derivativeKey(image.storageKey, width));
		}
	}

	revalidatePath(`/dashboard/pieces/${pieceId}`);
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

/**
 * A colourway, a cut, a size. **Options, not separate products** *(R2)*, each
 * carrying a modifier that defaults to zero and may be negative *(R3)* — so the
 * total on the button is always the real one.
 *
 * **There is no gender here and there will not be.** What changes the making is
 * the cut, not the customer.
 */
export async function addOption(form: FormData): Promise<void> {
	const db = await gate();
	const pieceId = id(form);
	const group = text(form, "group");
	if (group !== "colourway" && group !== "cut" && group !== "size") return;

	const label = text(form, "label");
	if (!label) return;

	await db.insert(schema.pieceOptions).values({
		pieceId,
		group,
		key: slugify(label),
		label,
		priceModifier: number(form, "priceModifier") ?? 0,
	});

	revalidatePath(`/dashboard/pieces/${pieceId}`);
}

/**
 * Off means it is not offered today, **without losing the orders that chose
 * it**. That is why this toggles rather than deletes.
 */
export async function toggleOption(form: FormData): Promise<void> {
	const db = await gate();
	const pieceId = id(form);
	const optionId = text(form, "optionId");

	await db
		.update(schema.pieceOptions)
		.set({ available: sql`NOT ${schema.pieceOptions.available}`, updatedAt: new Date() })
		.where(eq(schema.pieceOptions.id, optionId));

	revalidatePath(`/dashboard/pieces/${pieceId}`);
}

// ---------------------------------------------------------------------------
// The window display
// ---------------------------------------------------------------------------

/**
 * **His hand choosing what a stranger meets first** *(R1, R10)*.
 *
 * Emphatically not simply the four most recent — the collection page already
 * answers newest-first. Changeable at will, so nothing is ever made artificially
 * scarce.
 *
 * A commission piece can never enter it *(R6)*, which is enforced here and in
 * the query that reads it.
 */
export async function toggleWindow(form: FormData): Promise<void> {
	const db = await gate();
	const pieceId = id(form);

	const [piece] = await db
		.select({ kind: schema.pieces.kind, state: schema.pieces.state })
		.from(schema.pieces)
		.where(eq(schema.pieces.id, pieceId))
		.limit(1);
	if (!piece || piece.kind !== "collection" || piece.state !== "live") return;

	const [existing] = await db
		.select({ pieceId: schema.windowDisplay.pieceId })
		.from(schema.windowDisplay)
		.where(eq(schema.windowDisplay.pieceId, pieceId))
		.limit(1);

	if (existing) {
		await db.delete(schema.windowDisplay).where(eq(schema.windowDisplay.pieceId, pieceId));
	} else {
		const [last] = await db
			.select({ total: count() })
			.from(schema.windowDisplay);
		await db.insert(schema.windowDisplay).values({ pieceId, position: last?.total ?? 0 });
	}

	revalidatePath("/dashboard/pieces");
}
