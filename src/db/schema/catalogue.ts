// The catalogue: what he makes, and what a piece is.
//
// A piece is one garment plus one scene, sold as a single design *(R2)*. There
// is no shared scene library — the same scene on two garments is two pieces
// and he writes the story twice — and there is no "template", a word R2 retired
// for inviting a blank-garment reading.

import { sql } from "drizzle-orm";
import {
	boolean,
	check,
	index,
	integer,
	pgTable,
	primaryKey,
	real,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { createdAt, currency, id, money, position, updatedAt } from "./columns";
import { garmentAudience, locale, optionGroup, pieceKind, pieceState } from "./enums";

/**
 * A shape he cuts — bucket hat, jacket, vest, shorts, *kids 2–6*.
 *
 * Set up once in Settings and untouched for months, which is the definition of
 * a setting rather than a section *(R9b)*. It carries the two things a fit form
 * needs: which measurements to ask for, and what counts as a plausible answer.
 *
 * **Definitions in code, ranges here** *(R7)*. A measurement only means
 * something if it has a place on the drawing, and the drawing is code — so he
 * cannot invent a measurement with nowhere to render. He *can* widen a
 * guardrail the day a real customer is blocked, without a deploy.
 */
export const garmentTypes = pgTable("garment_types", {
	id: id(),

	/**
	 * The stable identifier the code joins on — `bucket-hat`, `kids-2-6`.
	 * Never renamed; the display name is what changes.
	 */
	key: text("key").notNull().unique(),

	/** English canonical. Kinyarwanda lives in {@link garmentTypeTranslations}. */
	name: text("name").notNull(),

	audience: garmentAudience("audience").notNull(),

	/**
	 * Which drawing this type's fit diagram uses.
	 *
	 * **A reference, not a file bound to the type** *(R13c)*. One column holding
	 * a key, so *kids 2–6* and *kids 7–12* point at one SVG. The alternative is
	 * two identical files that drift the moment either is edited, and R7's
	 * original "one SVG per garment type" is the line R13c came back to amend.
	 *
	 * The code owns the drawings and the anchor names; this says which one.
	 */
	diagramKey: text("diagram_key").notNull(),

	/**
	 * The age band this type is cut for, in years. Kids types only.
	 *
	 * A three-year-old and a twelve-year-old differ by roughly double on every
	 * measurement, so one kids band passes anything — and a guardrail that never
	 * fires is worse than none, because it looks like a check *(R13c)*. He
	 * creates more than one kids type, split wherever his own cutting splits.
	 *
	 * Null on adult types. This is what the age on a fit record is read
	 * against; it is not a second guardrail band of its own.
	 */
	ageMinYears: integer("age_min_years"),
	ageMaxYears: integer("age_max_years"),

	/** Whether the type is offered on new pieces. Never deleted once used. */
	active: boolean("active").notNull().default(true),

	position: position(),
	createdAt: createdAt(),
	updatedAt: updatedAt(),
});

/** Kinyarwanda for a garment type. Missing rows fall back to English silently. */
export const garmentTypeTranslations = pgTable(
	"garment_type_translations",
	{
		garmentTypeId: uuid("garment_type_id")
			.notNull()
			.references(() => garmentTypes.id, { onDelete: "cascade" }),
		locale: locale("locale").notNull(),
		name: text("name"),
		updatedAt: updatedAt(),
	},
	(table) => [primaryKey({ columns: [table.garmentTypeId, table.locale] })],
);

/**
 * One measurement asked for on one garment type, with the three guardrail
 * bands in force for it.
 *
 * **The bands are two nested ranges, which is three bands** *(R7)*:
 *
 * - inside plausible — passes silently;
 * - outside plausible but inside impossible — asks a gentle question that must
 *   be acknowledged, **and the acknowledgement is recorded**;
 * - outside impossible — the only hard stop.
 *
 * Soft by design. **A hard block on a real body is the site telling someone
 * their body is wrong**, so the bands are evidence for adjudication rather than
 * validation of the person.
 *
 * The values themselves are his call and are first on the homework list —
 * nobody who does not cut the cloth can answer it. They are dashboard fields
 * for exactly that reason.
 */
export const garmentTypeMeasurements = pgTable(
	"garment_type_measurements",
	{
		id: id(),
		garmentTypeId: uuid("garment_type_id")
			.notNull()
			.references(() => garmentTypes.id, { onDelete: "cascade" }),

		/**
		 * Which measurement, by the key its definition uses in code — `chest`,
		 * `height`, `head`.
		 *
		 * The label, the how-to-measure sentence and the anchor on the drawing
		 * all live in code against this key. He picks from that list; he cannot
		 * invent a key with nowhere to render.
		 */
		measurementKey: text("measurement_key").notNull(),

		/**
		 * Order on the form and on the drawing.
		 *
		 * **A kids type leads with height** *(R13c)* — children's sizing is
		 * height-driven where adult sizing is chest and waist. That is a property
		 * of this list, which is why it needed no new schema.
		 */
		position: position(),

		/** Whether the form may be submitted without it. */
		required: boolean("required").notNull().default(true),

		/** The band that passes without comment. */
		plausibleMin: integer("plausible_min").notNull(),
		plausibleMax: integer("plausible_max").notNull(),

		/** Outside this, the form refuses. Nothing else refuses. */
		impossibleMin: integer("impossible_min").notNull(),
		impossibleMax: integer("impossible_max").notNull(),

		createdAt: createdAt(),
		updatedAt: updatedAt(),
	},
	(table) => [
		uniqueIndex("garment_type_measurements_key_idx").on(
			table.garmentTypeId,
			table.measurementKey,
		),
		// The three bands only exist if the two ranges nest. Entering them the
		// wrong way round in Settings would silently make every value
		// impossible, which is the failure that looks most like the form being
		// broken and least like a number being wrong.
		check(
			"garment_type_measurements_bands_nest",
			sql`impossible_min <= plausible_min AND plausible_min <= plausible_max AND plausible_max <= impossible_max`,
		),
	],
);

/**
 * A piece: one garment, one scene, one design.
 *
 * **Nothing here is inventory.** Everything is stitched after it is asked for,
 * so there is no stock count, no sold state and no way for the schema to
 * express scarcity *(R1, R17)*.
 */
export const pieces = pgTable(
	"pieces",
	{
		id: id(),

		/** The URL segment beneath `/collection`. */
		slug: text("slug").notNull().unique(),

		/**
		 * Collection or commission *(R6)*.
		 *
		 * Pieces is one dashboard section filtered by this, defaulting to
		 * collection — not two sections. A commission piece is minted at design
		 * agreement and stays reachable, because R6's clone action has to find an
		 * abandoned design and Phase 8's past-commission stories need somewhere
		 * to be written.
		 *
		 * **Every public query is `kind = 'collection' AND state = 'live'`**,
		 * never a hand-maintained list. That is what makes a commission piece
		 * unlistable by schema rather than by discipline.
		 */
		kind: pieceKind("kind").notNull().default("collection"),

		/** Draft on create *(R9b)*. See the check constraint below for publish. */
		state: pieceState("state").notNull().default("draft"),

		garmentTypeId: uuid("garment_type_id")
			.notNull()
			.references(() => garmentTypes.id, { onDelete: "restrict" }),

		/** English canonical. */
		name: text("name").notNull(),

		/**
		 * The one line under the name on the card, and the default alt text for
		 * every photo of it.
		 */
		sceneLine: text("scene_line"),

		/** The long story on the piece's own page. */
		story: text("story"),

		/**
		 * **A price, not a starting price** *(R3)*.
		 *
		 * It must be the ordinary configuration, not the cheapest edge case —
		 * otherwise the card price is fiction and "from" pricing has returned by
		 * the back door. Anything that legitimately costs more is a modifier,
		 * shown while it is being chosen, so the button always says the real
		 * total.
		 */
		basePrice: money("base_price"),
		currency: currency(),

		/**
		 * How long this piece takes to stitch. A property of the craft, set once
		 * *(R4)*.
		 *
		 * The customer sees this plus the global queue offset. **Priority moves
		 * the offset and never this number** — the data model itself cannot
		 * express "we stitch it faster", which is the promise enforced by schema
		 * rather than by discipline.
		 */
		makingDays: integer("making_days"),

		/**
		 * Cloth that was saved rather than new *(R17)*.
		 *
		 * The entire schema cost of Ubuntu for Nature. It drives no separate
		 * query, no separate route, no second grid — a reborn piece sits in the
		 * one catalogue beside every other, browsed and ordered the same way.
		 *
		 * **There is no source entity to point at**, deliberately: the buyer
		 * knows the piece is reborn and is not shown the bin it came from. That
		 * is why this is a flag and not a relationship.
		 */
		reborn: boolean("reborn").notNull().default(false),

		/**
		 * When it first went live. Sorted from day one *(R10)*.
		 *
		 * **The collection page sorts newest-first and is the permanent answer to
		 * "what's new"** — there is no `/new`, and never a "drop", because a drop
		 * implies the thing goes away and nothing here does. The visible *newly
		 * stitched* marker waits until the catalogue earns it: a badge on all
		 * four pieces says nothing.
		 */
		publishedAt: timestamp("published_at", { withTimezone: true }),

		createdAt: createdAt(),
		updatedAt: updatedAt(),
	},
	(table) => [
		// The public query, and the collection page's sort, in one index.
		index("pieces_public_idx").on(table.kind, table.state, table.publishedAt),
		// R9b's publish floor — photo, price, scene line, alt text — for the
		// parts of it a column can see. Photo and alt text need a join, so they
		// stay in the publish action; price and scene line are the ones that
		// would reach a stranger, and the database can simply refuse them.
		//
		// `making_days` is deliberately *not* in here. The floor R9b wrote is
		// four things and that is not one of them, and a check constraint is the
		// wrong place to add a fifth nobody asked for.
		check(
			"pieces_publish_floor",
			sql`state <> 'live' OR (scene_line IS NOT NULL AND base_price IS NOT NULL AND published_at IS NOT NULL)`,
		),
		// R6's rule — a commission piece is never listed publicly and never
		// enters the window display — is not enforced here, and that is on
		// purpose. It is enforced where R9b put it: **every public query is
		// `kind = 'collection' AND state = 'live'`**, never a hand-maintained
		// list. Forbidding `live` on a commission piece here would instead force
		// every finished commission to sit in the dashboard as a draft, which
		// misdescribes it — the piece was made and delivered.
	],
);

/**
 * Kinyarwanda for a piece.
 *
 * **Per-entity translation rows with a fallback chain** *(R14)* — adding a
 * locale is inserting rows, never altering tables. Every column is nullable
 * because a missing Kinyarwanda story falls back to English silently: he is
 * never blocked from publishing a piece by a translation.
 */
export const pieceTranslations = pgTable(
	"piece_translations",
	{
		pieceId: uuid("piece_id")
			.notNull()
			.references(() => pieces.id, { onDelete: "cascade" }),
		locale: locale("locale").notNull(),
		name: text("name"),
		sceneLine: text("scene_line"),
		story: text("story"),
		updatedAt: updatedAt(),
	},
	(table) => [primaryKey({ columns: [table.pieceId, table.locale] })],
);

/**
 * A choice on a piece — a colourway, a cut, a size.
 *
 * **Options, not separate products** *(R2)*. Each carries a modifier which
 * defaults to zero and may be negative *(R3)*, so the total shown on the button
 * is always the real one.
 */
export const pieceOptions = pgTable(
	"piece_options",
	{
		id: id(),
		pieceId: uuid("piece_id")
			.notNull()
			.references(() => pieces.id, { onDelete: "cascade" }),

		group: optionGroup("group").notNull(),

		/** Stable identifier within the group, for the form and the snapshot. */
		key: text("key").notNull(),

		/** English canonical — *Indigo*, *Straight*, *Medium*. */
		label: text("label").notNull(),

		/**
		 * What choosing this adds to the base price. Zero for most, negative
		 * where he wants it to be.
		 */
		priceModifier: money("price_modifier").notNull().default(0),

		/** Off means it is not offered today, without losing the orders that chose it. */
		available: boolean("available").notNull().default(true),

		position: position(),
		createdAt: createdAt(),
		updatedAt: updatedAt(),
	},
	(table) => [uniqueIndex("piece_options_key_idx").on(table.pieceId, table.group, table.key)],
);

/** Kinyarwanda for an option label. */
export const pieceOptionTranslations = pgTable(
	"piece_option_translations",
	{
		pieceOptionId: uuid("piece_option_id")
			.notNull()
			.references(() => pieceOptions.id, { onDelete: "cascade" }),
		locale: locale("locale").notNull(),
		label: text("label"),
		updatedAt: updatedAt(),
	},
	(table) => [primaryKey({ columns: [table.pieceOptionId, table.locale] })],
);

/**
 * A catalogue photograph. **Public bucket** *(R8)*.
 *
 * One row per photograph, not per derivative. Three derivatives exist in R2 —
 * 400, 800 and 1600 px WebP — and the loader in `src/lib/image-loader.ts` maps
 * a requested width to the nearest one. `storageKey` is the content-hashed base
 * they share, which is what lets the objects be served `immutable`.
 *
 * **No original is kept. His phone is the archive.**
 */
export const pieceImages = pgTable(
	"piece_images",
	{
		id: id(),
		pieceId: uuid("piece_id")
			.notNull()
			.references(() => pieces.id, { onDelete: "cascade" }),

		/** The content-hashed key the three derivatives are built from. */
		storageKey: text("storage_key").notNull().unique(),

		/**
		 * Intrinsic size, stored rather than measured at runtime.
		 *
		 * **Every image reserves its space before it loads.** A page that shifts
		 * as photos arrive breaks the reveals underneath them, which makes layout
		 * shift a motion bug here rather than a performance metric.
		 */
		width: integer("width").notNull(),
		height: integer("height").notNull(),

		/**
		 * Where to hold the crop, as fractions of the image's own width and
		 * height. `0.5, 0.5` is dead centre.
		 *
		 * Cards crop 4:5 with `object-fit: cover`, and this is what stops that
		 * crop beheading people.
		 */
		focalX: real("focal_x").notNull().default(0.5),
		focalY: real("focal_y").notNull().default(0.5),

		/**
		 * **Required**, defaulting to the piece's scene line *(R8)*.
		 *
		 * Not null here rather than "usually filled in": the default is applied
		 * when the row is written, so there is no path that produces an image
		 * without one.
		 */
		alt: text("alt").notNull(),

		position: position(),
		createdAt: createdAt(),
		updatedAt: updatedAt(),
	},
	(table) => [
		index("piece_images_piece_idx").on(table.pieceId, table.position),
		check(
			"piece_images_focal_in_range",
			sql`focal_x >= 0 AND focal_x <= 1 AND focal_y >= 0 AND focal_y <= 1`,
		),
	],
);

/**
 * The window display on the landing page — **his hand choosing what a stranger
 * meets first** *(R1, R10)*.
 *
 * A table rather than a column on the piece, because it is an ordered list he
 * curates, and because it is emphatically **not** simply the four most recent:
 * the collection page already answers newest-first.
 *
 * Changeable at will, so nothing is ever made artificially scarce.
 */
export const windowDisplay = pgTable(
	"window_display",
	{
		pieceId: uuid("piece_id")
			.primaryKey()
			.references(() => pieces.id, { onDelete: "cascade" }),
		position: position(),
		updatedAt: updatedAt(),
	},
	(table) => [index("window_display_position_idx").on(table.position)],
);
