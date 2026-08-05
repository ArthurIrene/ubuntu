import Link from "next/link";

import { formatMoney } from "@/emails/order";
import type { PieceCard as Card } from "@/lib/catalogue";
import type { Locale } from "@/lib/locale";
import { piecePath } from "@/lib/routes";

import { CardPhoto } from "./piece-photo";

/**
 * One piece on a grid. **Four things, and the whole card is the door** *(foundation
 * §11B)* — photograph, name, the scene in a few words, base price. No cart, no
 * quick-add, nothing that behaves like a shop.
 *
 * Every string on a card is his own content, which is why no copy is threaded in
 * here: the name, the scene line and the alt text are all fields.
 *
 * The price is the ordinary configuration and not a starting price *(R3)*: anything
 * that legitimately costs more is a modifier chosen on the piece's own page, so
 * the figure here is real.
 *
 * **A `reborn` piece renders exactly like any other** *(R17)* — no badge, no
 * provenance line, no second card shape. The rescuing is told in the story and in
 * marketing; the finished piece stands as his work like all his work.
 *
 * ── DRESSED IN ROUND 1'S LANGUAGE ────────────────────────────────────────────
 *
 * **Cream and ink only, and nothing drawn around the photograph.** This card is
 * never anywhere but next to a garment, so the colour law forbids a cloth tone
 * here permanently — not for this round, but for good. No frame, no rule, no
 * tint: anything painted around the picture competes with it, and the piece has
 * to be the highest-contrast thing on the page.
 *
 * **No hover.** A stitch that sews itself under the name is a sketched moment
 * and needs proposing before it is built, so the card is still and simply
 * navigates. Keyboard focus is the base `:focus-visible` ring, which lands on
 * the whole card because the whole card is the door.
 *
 * **This component is shared with the homepage window display**, which is still
 * in its raw skeleton — so dressing it here dresses the two cards there too. It
 * is one card with one design by design; the alternative was a variant API for a
 * component that should not have one.
 */
export default function PieceCard({
	locale,
	card,
	sizes,
	priority,
}: {
	locale: Locale;
	card: Card;
	sizes: string;
	priority?: boolean;
}) {
	return (
		<li>
			<Link href={piecePath(locale, card.slug)} className="block">
				<CardPhoto image={card.image} sizes={sizes} priority={priority} />
				<h3 className="mt-4 font-serif text-xl leading-tight md:text-2xl">{card.name}</h3>
				{/* The scene in a few words, and the default alt text for every
				    photograph of it. Set in the italic the product page gives the same
				    sentence, so a card and the page it opens speak in one voice. */}
				{card.sceneLine && (
					<p className="serif-italic mt-1.5 leading-snug text-(--ink-quiet)">{card.sceneLine}</p>
				)}
				{/* Guaranteed by the publish floor — a live piece has a price, and the
				    database refuses one without. Rendered conditionally because the
				    column is nullable for the weeks a piece spends as a draft.
				    Quiet: a real figure, stated once, never a shop's shout. */}
				{card.price && <p className="mt-2 text-sm text-(--ink-quiet)">{formatMoney(card.price)}</p>}
			</Link>
		</li>
	);
}
