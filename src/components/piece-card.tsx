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
			<Link href={piecePath(locale, card.slug)}>
				<CardPhoto image={card.image} sizes={sizes} priority={priority} />
				<h3>{card.name}</h3>
				{/* The scene in a few words, and the default alt text for every
				    photograph of it. */}
				{card.sceneLine && <p>{card.sceneLine}</p>}
				{/* Guaranteed by the publish floor — a live piece has a price, and the
				    database refuses one without. Rendered conditionally because the
				    column is nullable for the weeks a piece spends as a draft. */}
				{card.price && <p>{formatMoney(card.price)}</p>}
			</Link>
		</li>
	);
}
