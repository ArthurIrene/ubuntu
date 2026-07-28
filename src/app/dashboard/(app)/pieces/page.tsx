import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";

import { getDb, schema } from "@/db/client";
import { formatMoney } from "@/emails/order";
import { requireSession } from "@/lib/auth";

import { createPiece, toggleWindow } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Pieces — **one section filtered by `kind`, defaulting to collection**
 * *(R9b)*.
 *
 * Commission pieces stay reachable, because R6's clone action has to find an
 * abandoned design and Phase 8's past-commission stories need somewhere to be
 * written — but they do not sit between him and the four window-display
 * choices. No second section, no schema: `kind` already exists and is doing the
 * work.
 */
export default async function Pieces({
	searchParams,
}: {
	searchParams: Promise<{ kind?: string }>;
}) {
	await requireSession();
	const { kind } = await searchParams;
	const db = await getDb();

	const filter = kind === "commission" ? "commission" : "collection";

	const [pieces, garmentTypes, window] = await Promise.all([
		db
			.select({
				id: schema.pieces.id,
				name: schema.pieces.name,
				slug: schema.pieces.slug,
				state: schema.pieces.state,
				basePrice: schema.pieces.basePrice,
				currency: schema.pieces.currency,
				makingDays: schema.pieces.makingDays,
				reborn: schema.pieces.reborn,
				publishedAt: schema.pieces.publishedAt,
			})
			.from(schema.pieces)
			.where(eq(schema.pieces.kind, filter))
			// Newest-first, the same order the collection page uses *(R10)*.
			.orderBy(desc(schema.pieces.publishedAt), desc(schema.pieces.createdAt)),
		db.select().from(schema.garmentTypes).orderBy(asc(schema.garmentTypes.position)),
		db.select({ pieceId: schema.windowDisplay.pieceId }).from(schema.windowDisplay),
	]);

	const inWindow = new Set(window.map((row) => row.pieceId));

	return (
		<main>
			<h1>Pieces</h1>

			<p>
				<Link href="/dashboard/pieces">Collection</Link> ·{" "}
				<Link href="/dashboard/pieces?kind=commission">Only yours</Link>
			</p>

			{garmentTypes.length === 0 && (
				<p>
					There are no garment types yet, and a piece needs one.{" "}
					<Link href="/dashboard/settings">Settings</Link> is where they live.
				</p>
			)}

			<ul>
				{pieces.map((piece) => (
					<li key={piece.id}>
						<Link href={`/dashboard/pieces/${piece.id}`}>{piece.name}</Link> ·{" "}
						{/*
						 * **Removed and draft look identical to the public and are
						 * different facts** *(R9b)*. This is where the difference shows.
						 */}
						{piece.state}
						{piece.basePrice !== null &&
							` · ${formatMoney({ value: piece.basePrice, currency: piece.currency })}`}
						{piece.makingDays !== null && ` · ${piece.makingDays} days`}
						{piece.reborn && " · reborn"}

						{filter === "collection" && piece.state === "live" && (
							<form action={toggleWindow}>
								<input type="hidden" name="pieceId" value={piece.id} />
								<button type="submit">
									{inWindow.has(piece.id) ? "Take out of the window" : "Put in the window"}
								</button>
							</form>
						)}
					</li>
				))}
				{pieces.length === 0 && <li>None yet.</li>}
			</ul>

			<h2>The window display</h2>
			<p>
				{/*
				 * **His hand choosing what a stranger meets first** *(R1, R10)* — not
				 * simply the four most recent, which is what the collection page
				 * already answers.
				 */}
				{inWindow.size === 0
					? "Nothing chosen yet. This is what a stranger meets first."
					: `${inWindow.size} chosen.`}
			</p>

			<details>
				<summary>Start a new piece</summary>
				{/* **Draft on create**, so he can work for weeks and nothing leaks. */}
				<form action={createPiece}>
					<label htmlFor="name">Name</label>
					<input id="name" name="name" type="text" required />

					<label htmlFor="garmentTypeId">Garment type</label>
					<select id="garmentTypeId" name="garmentTypeId" required>
						{garmentTypes.map((type) => (
							<option key={type.id} value={type.id}>
								{type.name}
							</option>
						))}
					</select>

					<label htmlFor="kind">Kind</label>
					<select id="kind" name="kind" defaultValue={filter}>
						<option value="collection">collection</option>
						<option value="commission">only yours</option>
					</select>

					<button type="submit" disabled={garmentTypes.length === 0}>
						Create it as a draft
					</button>
				</form>
			</details>
		</main>
	);
}
