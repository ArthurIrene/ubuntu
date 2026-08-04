import Image from "next/image";

import type { CardImage } from "@/lib/catalogue";
import { storage } from "@/lib/storage";

/**
 * A catalogue photograph, in the space it will occupy before it arrives.
 *
 * **Layout shift is a motion bug here, not a performance metric.** Phase 6 builds
 * its reveals on this layout — a section that rises 15px as its photo lands has
 * two things moving at once, which breaks the fourth law before the animation is
 * even written. Width and height are stored per image for exactly this reason, so
 * nothing here measures anything at runtime.
 *
 * `next/image` is kept for `srcset`, lazy loading and layout stability, and for
 * nothing else — the loader is a URL mapper, not a transformer.
 *
 * The geometry below is reservation, not design: an aspect ratio, a crop, and a
 * focal point. Phase 5 owns everything about how this looks.
 */

/**
 * Cards crop 4:5, which is where the focal point earns its place *(R8)*.
 *
 * The lead photograph on a piece's own page is the same crop, because R8's
 * photography brief asks him for **a 4:5 portrait lead image per piece** — so
 * the card and the page it opens are the same shape, and the one is the other
 * enlarged.
 */
const CARD_ASPECT = "4 / 5";

export interface PiecePhotoProps {
	image: CardImage | null;
	/** What the browser should assume about the rendered width. */
	sizes: string;
	/**
	 * The first photograph a visitor meets. Everything else is lazy — most of them
	 * arrive on a phone from Instagram, on data they are paying for by the megabyte.
	 */
	priority?: boolean;
	/** Alt text, where the piece's own words beat the stored default. */
	alt?: string;
}

/**
 * The card crop: a 4:5 box, the photograph covering it, held at its focal point.
 *
 * The focal point is what stops the crop beheading people — a 4:5 window on a
 * 3:2 photograph throws away a third of it, and which third is his call, made by
 * clicking the photo in the dashboard.
 */
export function CardPhoto({ image, sizes, priority, alt }: PiecePhotoProps) {
	return (
		<div style={{ position: "relative", aspectRatio: CARD_ASPECT, overflow: "hidden" }}>
			{image ? (
				<Image
					src={storage.publicUrl(image.storageKey)}
					alt={alt ?? image.alt}
					fill
					sizes={sizes}
					priority={priority}
					style={{
						objectFit: "cover",
						objectPosition: `${image.focalX * 100}% ${image.focalY * 100}%`,
					}}
				/>
			) : (
				/*
				 * No photograph. A live piece cannot reach here — the publish floor
				 * requires one — so this is a draft being previewed, or a photo whose
				 * row survived its file. Either way the box is the same size the
				 * picture would have been, because a placeholder that collapses is
				 * the layout shift arriving late instead of never.
				 */
				<div
					aria-hidden="true"
					style={{ position: "absolute", inset: 0, background: "var(--canvas-shade)" }}
				/>
			)}
		</div>
	);
}

/**
 * The lead photograph on a piece's own page — the same 4:5 crop, held at the
 * same focal point, one size larger. Named for where it sits, because
 * `CardPhoto` on a page that is not a card reads as a mistake.
 */
export const LeadPhoto = CardPhoto;

/**
 * A photograph at its own proportions, filling the width it is given.
 *
 * The stored width and height set the ratio, so the space is reserved from the
 * first paint and the picture drops into a gap that already fits.
 */
export function FullPhoto({ image, sizes, priority, alt }: PiecePhotoProps) {
	if (!image) {
		return (
			<div
				aria-hidden="true"
				style={{ aspectRatio: CARD_ASPECT, background: "var(--canvas-shade)" }}
			/>
		);
	}

	return (
		<Image
			src={storage.publicUrl(image.storageKey)}
			alt={alt ?? image.alt}
			width={image.width}
			height={image.height}
			sizes={sizes}
			priority={priority}
			// The intrinsic ratio is what reserves the space; the width is whatever
			// the layout gives it.
			style={{ width: "100%", height: "auto" }}
		/>
	);
}
