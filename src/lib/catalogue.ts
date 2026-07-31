// Everything the public site reads, and nothing it writes.
//
// **Every public query is `kind = 'collection' AND state = 'live'`** — never a
// hand-maintained list *(R9b)*. That is what makes a commission piece unlistable
// by schema rather than by discipline, and what makes `draft` safe: he works for
// weeks with photos missing and half-written stories and nothing leaks. So the
// predicate is written once, here, and every read on this page composes it.
//
// `removed` and `draft` look identical to a stranger and are different facts. The
// difference shows in the dashboard; these queries do not care.
//
// **The grid query loads card fields only** *(R8)*. Loading full stories and whole
// photo sets to render a collection grid is how the site becomes slow on mobile
// data, which is the constraint that decided most of this architecture.

import { and, asc, desc, eq } from "drizzle-orm";

import { getDb, schema } from "@/db/client";
import type { Locale } from "@/lib/locale";

/** The one predicate. */
const isPublic = and(eq(schema.pieces.kind, "collection"), eq(schema.pieces.state, "live"));

/**
 * An image with the three things that let it be placed before it arrives.
 *
 * Width, height and the focal point are stored, never measured at runtime:
 * **every image reserves its space before it loads**, because a page that shifts
 * as photos arrive breaks the reveals Phase 6 builds on top of this layout. Layout
 * shift is a motion bug here, not a performance metric.
 */
export interface CardImage {
	/** The content-hashed base key the three derivatives share. */
	storageKey: string;
	width: number;
	height: number;
	focalX: number;
	focalY: number;
	/** Required in the schema, defaulting to the piece's scene line *(R8)*. */
	alt: string;
}

/**
 * A piece as a card: **four things and a door** *(foundation §11B)* — photo, name,
 * the scene in a few words, base price. Nothing else is read.
 */
export interface PieceCard {
	slug: string;
	name: string;
	sceneLine: string | null;
	/** A price, not a starting price *(R3)*. Null only if the floor were bypassed. */
	price: { value: number; currency: string } | null;
	image: CardImage | null;
}

/** The full page: everything a card has, plus what only the piece's own page shows. */
export interface PieceDetail extends PieceCard {
	story: string | null;
	makingDays: number | null;
	/** Every photograph, in his order — the card image is the first of these. */
	images: CardImage[];
	/**
	 * The choices he offers, in his order.
	 *
	 * `key` is the stable identifier the order form posts and the price snapshot
	 * resolves against — **never the label**, which is translated and which he
	 * can reword between someone opening the page and someone submitting it.
	 */
	options: { group: "colourway" | "cut" | "size"; key: string; label: string }[];
	/** `kids` adds one line to the fit copy: *cut with room to grow* *(R13)*. */
	audience: "adult" | "kids";
}

/**
 * The card fields, in one query.
 *
 * The one image is a `DISTINCT ON` subquery rather than a second read of every
 * photograph: joining `piece_images` directly would return one row per photo and
 * make the grid's cost grow with his photography, which is the failure R8's
 * card-fields rule exists to prevent.
 */
function cardQuery(locale: Locale) {
	return getDb().then((db) => {
		const cardImage = db
			.selectDistinctOn([schema.pieceImages.pieceId], {
				pieceId: schema.pieceImages.pieceId,
				storageKey: schema.pieceImages.storageKey,
				width: schema.pieceImages.width,
				height: schema.pieceImages.height,
				focalX: schema.pieceImages.focalX,
				focalY: schema.pieceImages.focalY,
				alt: schema.pieceImages.alt,
			})
			.from(schema.pieceImages)
			.orderBy(
				schema.pieceImages.pieceId,
				asc(schema.pieceImages.position),
				asc(schema.pieceImages.createdAt),
			)
			.as("card_image");

		const fields = {
			id: schema.pieces.id,
			slug: schema.pieces.slug,
			name: schema.pieces.name,
			translatedName: schema.pieceTranslations.name,
			sceneLine: schema.pieces.sceneLine,
			translatedSceneLine: schema.pieceTranslations.sceneLine,
			basePrice: schema.pieces.basePrice,
			currency: schema.pieces.currency,
			publishedAt: schema.pieces.publishedAt,
			createdAt: schema.pieces.createdAt,
			image: {
				storageKey: cardImage.storageKey,
				width: cardImage.width,
				height: cardImage.height,
				focalX: cardImage.focalX,
				focalY: cardImage.focalY,
				alt: cardImage.alt,
			},
		};

		const base = db
			.select(fields)
			.from(schema.pieces)
			.leftJoin(cardImage, eq(cardImage.pieceId, schema.pieces.id))
			// A missing Kinyarwanda value falls back to English silently — he is
			// never blocked from publishing by a translation *(R14)*.
			.leftJoin(
				schema.pieceTranslations,
				and(
					eq(schema.pieceTranslations.pieceId, schema.pieces.id),
					eq(schema.pieceTranslations.locale, locale),
				),
			);

		return { db, base };
	});
}

type CardRow = {
	slug: string;
	name: string;
	translatedName: string | null;
	sceneLine: string | null;
	translatedSceneLine: string | null;
	basePrice: number | null;
	currency: string;
	image: {
		storageKey: string | null;
		width: number | null;
		height: number | null;
		focalX: number | null;
		focalY: number | null;
		alt: string | null;
	} | null;
};

/** One row, with the translation overlaid and the image shaped or absent. */
function toCard(row: CardRow): PieceCard {
	return {
		slug: row.slug,
		name: row.translatedName ?? row.name,
		sceneLine: row.translatedSceneLine ?? row.sceneLine,
		price: row.basePrice === null ? null : { value: row.basePrice, currency: row.currency },
		image:
			row.image?.storageKey != null && row.image.width != null && row.image.height != null
				? {
						storageKey: row.image.storageKey,
						width: row.image.width,
						height: row.image.height,
						focalX: row.image.focalX ?? 0.5,
						focalY: row.image.focalY ?? 0.5,
						alt: row.image.alt ?? "",
					}
				: null,
	};
}

/**
 * The whole collection, **newest-first** *(R10)*.
 *
 * This page is the permanent answer to *what's new* — there is no `/new`, and
 * never a "drop", because a drop implies the thing goes away and nothing here
 * does. `published_at` sorts from day one; the visible *newly stitched* marker
 * waits until the catalogue earns it, because a badge on all four pieces says
 * nothing.
 *
 * A `reborn` piece is one row in this list like any other — no separate query, no
 * second grid, no badge *(R17)*.
 */
export async function collectionCards(locale: Locale): Promise<PieceCard[]> {
	const { base } = await cardQuery(locale);
	const rows = await base
		.where(isPublic)
		.orderBy(desc(schema.pieces.publishedAt), desc(schema.pieces.createdAt));
	return rows.map(toCard);
}

/**
 * The window display — **his hand choosing what a stranger meets first** *(R1,
 * R10)*, in the order he put them in.
 *
 * Emphatically not the four most recent: the collection page already answers
 * newest-first. A piece he has since taken down drops out of here by the same
 * predicate as everywhere else, without him having to remember to unpick it.
 */
export async function windowCards(locale: Locale): Promise<PieceCard[]> {
	const { base } = await cardQuery(locale);
	const rows = await base
		.innerJoin(schema.windowDisplay, eq(schema.windowDisplay.pieceId, schema.pieces.id))
		.where(isPublic)
		.orderBy(asc(schema.windowDisplay.position));
	return rows.map(toCard);
}

/**
 * One piece's own page: the story, every photograph, the options.
 *
 * `null` when nothing public answers to that slug — a draft, a removed piece, a
 * commission, or a slug that never existed. All four are the same 404 to a
 * stranger, deliberately: *removed* and *draft* are different facts in the
 * dashboard and the same absence here.
 */
export async function livePiece(locale: Locale, slug: string): Promise<PieceDetail | null> {
	const db = await getDb();

	const [piece] = await db
		.select({
			id: schema.pieces.id,
			slug: schema.pieces.slug,
			name: schema.pieces.name,
			translatedName: schema.pieceTranslations.name,
			sceneLine: schema.pieces.sceneLine,
			translatedSceneLine: schema.pieceTranslations.sceneLine,
			story: schema.pieces.story,
			translatedStory: schema.pieceTranslations.story,
			basePrice: schema.pieces.basePrice,
			currency: schema.pieces.currency,
			makingDays: schema.pieces.makingDays,
			audience: schema.garmentTypes.audience,
		})
		.from(schema.pieces)
		.innerJoin(schema.garmentTypes, eq(schema.garmentTypes.id, schema.pieces.garmentTypeId))
		.leftJoin(
			schema.pieceTranslations,
			and(
				eq(schema.pieceTranslations.pieceId, schema.pieces.id),
				eq(schema.pieceTranslations.locale, locale),
			),
		)
		.where(and(isPublic, eq(schema.pieces.slug, slug)))
		.limit(1);

	if (!piece) return null;

	const [images, options] = await Promise.all([
		db
			.select({
				storageKey: schema.pieceImages.storageKey,
				width: schema.pieceImages.width,
				height: schema.pieceImages.height,
				focalX: schema.pieceImages.focalX,
				focalY: schema.pieceImages.focalY,
				alt: schema.pieceImages.alt,
			})
			.from(schema.pieceImages)
			.where(eq(schema.pieceImages.pieceId, piece.id))
			.orderBy(asc(schema.pieceImages.position), asc(schema.pieceImages.createdAt)),
		db
			.select({
				group: schema.pieceOptions.group,
				key: schema.pieceOptions.key,
				label: schema.pieceOptions.label,
				translatedLabel: schema.pieceOptionTranslations.label,
			})
			.from(schema.pieceOptions)
			.leftJoin(
				schema.pieceOptionTranslations,
				and(
					eq(schema.pieceOptionTranslations.pieceOptionId, schema.pieceOptions.id),
					eq(schema.pieceOptionTranslations.locale, locale),
				),
			)
			// Off means it is not offered today, without losing the orders that
			// chose it — so an unavailable option is absent from the page, not
			// shown greyed out.
			.where(and(eq(schema.pieceOptions.pieceId, piece.id), eq(schema.pieceOptions.available, true)))
			.orderBy(asc(schema.pieceOptions.position)),
	]);

	return {
		slug: piece.slug,
		name: piece.translatedName ?? piece.name,
		sceneLine: piece.translatedSceneLine ?? piece.sceneLine,
		story: piece.translatedStory ?? piece.story,
		price:
			piece.basePrice === null ? null : { value: piece.basePrice, currency: piece.currency },
		makingDays: piece.makingDays,
		audience: piece.audience,
		images,
		image: images[0] ?? null,
		options: options.map((option) => ({
			group: option.group,
			key: option.key,
			label: option.translatedLabel ?? option.label,
		})),
	};
}

/**
 * What the fit fork may ask about one piece *(R7)*.
 *
 * **Definitions in code, ranges in the dashboard.** The list and the three
 * bands come from the piece's garment type, which is his to configure in
 * Settings — so he can widen a guardrail the day a real customer is blocked,
 * without a deploy, and he cannot invent a measurement with nowhere to render
 * on the drawing.
 *
 * An empty list is a legitimate answer and not a failure: the fork asks
 * nothing, and the numbers are settled with him after he confirms the piece.
 */
export interface GarmentFit {
	measurements: {
		measurementKey: string;
		required: boolean;
		position: number;
		plausibleMin: number;
		plausibleMax: number;
		impossibleMin: number;
		impossibleMax: number;
	}[];
	/** The sizes he offers on this piece, for the standard path. */
	sizes: { key: string; label: string }[];
}

export async function garmentFit(slug: string): Promise<GarmentFit> {
	const db = await getDb();

	const [piece] = await db
		.select({ id: schema.pieces.id, garmentTypeId: schema.pieces.garmentTypeId })
		.from(schema.pieces)
		.where(and(isPublic, eq(schema.pieces.slug, slug)))
		.limit(1);

	if (!piece) return { measurements: [], sizes: [] };

	const [measurements, sizes] = await Promise.all([
		db
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
			.where(eq(schema.garmentTypeMeasurements.garmentTypeId, piece.garmentTypeId))
			.orderBy(asc(schema.garmentTypeMeasurements.position)),
		// The standard path's sizes are the piece's own `size` option group —
		// already a concept, already carrying a price modifier, and already his to
		// set. No second source of truth for what sizes exist.
		db
			.select({ key: schema.pieceOptions.key, label: schema.pieceOptions.label })
			.from(schema.pieceOptions)
			.where(
				and(
					eq(schema.pieceOptions.pieceId, piece.id),
					eq(schema.pieceOptions.group, "size"),
					eq(schema.pieceOptions.available, true),
				),
			)
			.orderBy(asc(schema.pieceOptions.position)),
	]);

	return { measurements, sizes };
}

/** The numbers he turns, and the one line of theme copy he writes. */
export interface SiteSettings {
	currency: string;
	queueOffsetDays: number;
	priorityOffsetDays: number;
	priorityModifier: number;
	/** Null or zero means unanswered — the page renders `[X]`, never a guess. */
	designFee: number | null;
	replyTimeDays: number | null;
	/** Null falls back to the draft default in `src/content/` *(R9d)*. */
	collectionTheme: string | null;
}

/**
 * The single settings row, with its Kinyarwanda overlay.
 *
 * There is always exactly one — the `id = 1` check is what keeps it single — but
 * a public page must not 500 because a settings row was never seeded, so an
 * absent row resolves to the same defaults the column definitions carry.
 */
export async function siteSettings(locale: Locale): Promise<SiteSettings> {
	const db = await getDb();

	const [row] = await db
		.select({
			currency: schema.settings.currency,
			queueOffsetDays: schema.settings.queueOffsetDays,
			priorityOffsetDays: schema.settings.priorityOffsetDays,
			priorityModifier: schema.settings.priorityModifier,
			designFee: schema.settings.designFee,
			replyTimeDays: schema.settings.replyTimeDays,
			collectionTheme: schema.settings.collectionTheme,
			translatedTheme: schema.settingsTranslations.collectionTheme,
		})
		.from(schema.settings)
		.leftJoin(
			schema.settingsTranslations,
			and(
				eq(schema.settingsTranslations.settingsId, schema.settings.id),
				eq(schema.settingsTranslations.locale, locale),
			),
		)
		.limit(1);

	return {
		currency: row?.currency ?? "RWF",
		queueOffsetDays: row?.queueOffsetDays ?? 0,
		priorityOffsetDays: row?.priorityOffsetDays ?? 0,
		priorityModifier: row?.priorityModifier ?? 0,
		designFee: row?.designFee ?? null,
		replyTimeDays: row?.replyTimeDays ?? null,
		collectionTheme: row?.translatedTheme ?? row?.collectionTheme ?? null,
	};
}

/**
 * The makers, for the story page that names and celebrates them.
 *
 * **Every maker, active or not.** Someone who has stopped working with him is
 * deactivated rather than deleted, because the orders they made still point here
 * and the story page still names them — which is the whole reason R16 made this a
 * table with an FK instead of a string typed on each order.
 */
export async function makerNames(): Promise<string[]> {
	const db = await getDb();
	const rows = await db
		.select({ name: schema.makers.name })
		.from(schema.makers)
		.orderBy(asc(schema.makers.position), asc(schema.makers.createdAt));
	return rows.map((row) => row.name);
}
