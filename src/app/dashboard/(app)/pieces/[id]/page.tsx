import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, count, eq } from "drizzle-orm";

import PhotoUpload from "@/components/photo-upload";
import { getDb, schema } from "@/db/client";
import { requireSession } from "@/lib/auth";
import { derivativeKey } from "@/lib/image-loader";
import { storage } from "@/lib/storage";

import {
	addOption,
	deleteImage,
	deletePiece,
	publishPiece,
	savePiece,
	setFocalPoint,
	setState,
	toggleOption,
} from "../actions";

export const dynamic = "force-dynamic";

/**
 * One piece: **one garment, one scene, one design** *(R2)*.
 *
 * There is no shared scene library — the same scene on two garments is two
 * pieces and he writes the story twice — and the word *template* is retired for
 * inviting a blank-garment reading.
 */
export default async function PieceScreen({
	params,
	searchParams,
}: {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ missing?: string; e?: string }>;
}) {
	await requireSession();
	const { id } = await params;
	const { missing, e } = await searchParams;
	const db = await getDb();

	const [piece] = await db.select().from(schema.pieces).where(eq(schema.pieces.id, id)).limit(1);
	if (!piece) notFound();

	const [images, options, translation, garmentTypes, orders] = await Promise.all([
		db
			.select()
			.from(schema.pieceImages)
			.where(eq(schema.pieceImages.pieceId, id))
			.orderBy(asc(schema.pieceImages.position)),
		db
			.select()
			.from(schema.pieceOptions)
			.where(eq(schema.pieceOptions.pieceId, id))
			.orderBy(asc(schema.pieceOptions.group), asc(schema.pieceOptions.position)),
		db
			.select()
			.from(schema.pieceTranslations)
			.where(eq(schema.pieceTranslations.pieceId, id))
			.limit(2),
		db.select().from(schema.garmentTypes).orderBy(asc(schema.garmentTypes.position)),
		db.select({ total: count() }).from(schema.orders).where(eq(schema.orders.pieceId, id)),
	]);

	const rw = translation.find((row) => row.locale === "rw");
	const orderCount = orders[0]?.total ?? 0;

	return (
		<main>
			<Link
				href={`/dashboard/pieces${piece.kind === "commission" ? "?kind=commission" : ""}`}
				className="breadcrumb"
			>
				Pieces
			</Link>

			<h1>{piece.name}</h1>
			<p className="mb-4 flex flex-wrap items-center gap-1.5">
				<span className={`tag${piece.state === "live" ? " tag-live" : ""}`}>{piece.state}</span>
				<span className="tag">{piece.kind}</span>
				{piece.publishedAt && (
					<span className="meta">
						first published {piece.publishedAt.toISOString().slice(0, 10)}
					</span>
				)}
			</p>

			{missing && (
				<p role="alert">
					Not ready to publish. It still needs {missing}.
				</p>
			)}
			{/*
			 * He typed a slug another piece holds. The rest of the form did not
			 * save, which the sentence says rather than leaving him to discover it
			 * by comparing fields.
			 */}
			{e === "slug" && (
				<p role="alert">
					Another piece already uses that slug, so nothing here was saved. Two pieces cannot
					share an address on the site — give this one a slug of its own and save again.
				</p>
			)}
			{e === "orders" && (
				<p role="alert">
					This piece has {orderCount} order{orderCount === 1 ? "" : "s"}, so it cannot be
					deleted — past orders must always resolve to the piece they were for. Remove it from
					the site instead.
				</p>
			)}

			{/* ── The piece ─────────────────────────────────────────────────── */}
			<section className="panel">
				<h2>The piece</h2>
				<form action={savePiece} className="fields">
					<input type="hidden" name="pieceId" value={piece.id} />

					<div className="fields-row">
						<div>
							<label htmlFor="name">Name</label>
							<input id="name" name="name" type="text" defaultValue={piece.name} required />
						</div>

						<div>
							<label htmlFor="slug">Slug</label>
							<input id="slug" name="slug" type="text" defaultValue={piece.slug} />
						</div>
					</div>

					<div>
						<label htmlFor="garmentTypeId">Garment type</label>
						<select id="garmentTypeId" name="garmentTypeId" defaultValue={piece.garmentTypeId}>
							{garmentTypes.map((type) => (
								<option key={type.id} value={type.id}>
									{type.name}
								</option>
							))}
						</select>
					</div>

					{/* The one line under the name on the card, and the default alt text. */}
					<div>
						<label htmlFor="sceneLine">Scene line</label>
						<input
							id="sceneLine"
							name="sceneLine"
							type="text"
							defaultValue={piece.sceneLine ?? ""}
						/>
					</div>

					<div>
						<label htmlFor="story">The story</label>
						<textarea id="story" name="story" rows={6} defaultValue={piece.story ?? ""} />
					</div>

					{/*
					 * **A price, not a starting price** *(R3)*, and it must be the
					 * ordinary configuration rather than the cheapest edge case —
					 * otherwise the card price is fiction and "from" pricing has
					 * returned by the back door.
					 */}
					<div className="fields-row">
						<div>
							<label htmlFor="basePrice">Price</label>
							<input
								id="basePrice"
								name="basePrice"
								type="number"
								defaultValue={piece.basePrice ?? undefined}
							/>
						</div>

						{/*
						 * A property of the craft, set once *(R4)*. The customer sees this
						 * plus the global queue offset. **Priority moves the offset and
						 * never this number** — the model cannot express "we stitch it
						 * faster".
						 */}
						<div>
							<label htmlFor="makingDays">Making days</label>
							<input
								id="makingDays"
								name="makingDays"
								type="number"
								defaultValue={piece.makingDays ?? undefined}
							/>
						</div>
					</div>

					{/*
					 * Cloth that was saved rather than new *(R17)*. Told in the story
					 * and in marketing, **never as a feature on the product page**.
					 */}
					<label>
						<input type="checkbox" name="reborn" defaultChecked={piece.reborn} /> Reborn — the
						cloth was saved
					</label>

					{/*
					 * The second language, on the desk rather than in the flow of the
					 * form: it is the same three fields again, and reading it as a block
					 * is what stops him filling *Name* twice by mistake.
					 */}
					<div className="inset fields mt-2">
						<div>
							<h3>Kinyarwanda</h3>
							<p className="meta mt-1">
								Anything left empty falls back to English silently. Nothing is blocked on it.
							</p>
						</div>

						<div>
							<label htmlFor="rwName">Name</label>
							<input id="rwName" name="rwName" type="text" defaultValue={rw?.name ?? ""} />
						</div>

						<div>
							<label htmlFor="rwSceneLine">Scene line</label>
							<input
								id="rwSceneLine"
								name="rwSceneLine"
								type="text"
								defaultValue={rw?.sceneLine ?? ""}
							/>
						</div>

						<div>
							<label htmlFor="rwStory">The story</label>
							<textarea id="rwStory" name="rwStory" rows={6} defaultValue={rw?.story ?? ""} />
						</div>
					</div>

					<div className="form-actions">
						<button type="submit" className="btn-primary">
							Save
						</button>
					</div>
				</form>
			</section>

			{/* ── Photographs ───────────────────────────────────────────────── */}
			<section className="panel">
				<h2>Photographs</h2>
				<p className="meta mb-3">
					Resized and encoded on this device before they are sent — three at 400, 800 and 1600
					pixels. No original is kept; your phone is the archive.
				</p>

				<PhotoUpload target={{ kind: "piece", pieceId: piece.id }} alt={piece.sceneLine ?? ""} />

				<ul className="rows mt-4">
					{images.map((image) => (
						<li key={image.id} className="stacked">
							{/*
							 * Not `next/image`: the dashboard is unstyled and this is a
							 * check that the file is there and the right way up. The loader
							 * is for the public site.
							 */}
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img
								src={storage.publicUrl(derivativeKey(image.storageKey, 400))}
								alt={image.alt}
								width={200}
								height={Math.round((200 / image.width) * image.height)}
								className="mb-3"
							/>

							<form action={setFocalPoint} className="fields">
								<input type="hidden" name="pieceId" value={piece.id} />
								<input type="hidden" name="imageId" value={image.id} />

								{/*
								 * **Alt text is required, defaulting to the scene line**
								 * *(R8)*. It is a string a customer reads, so the copy rules
								 * govern it.
								 */}
								<div>
									<label htmlFor={`alt-${image.id}`}>Alt text</label>
									<input
										id={`alt-${image.id}`}
										name="alt"
										type="text"
										defaultValue={image.alt}
										required
									/>
								</div>

								{/*
								 * **Cards crop 4:5 with `object-fit: cover`, and the focal
								 * point is what stops that crop beheading people** *(R8)*.
								 * The pair sits on one line because it is one coordinate.
								 */}
								<div className="fields-row max-w-80">
									<div>
										<label htmlFor={`fx-${image.id}`}>Focal x</label>
										<input
											id={`fx-${image.id}`}
											name="focalX"
											type="number"
											step="0.05"
											min="0"
											max="1"
											defaultValue={image.focalX}
										/>
									</div>
									<div>
										<label htmlFor={`fy-${image.id}`}>Focal y</label>
										<input
											id={`fy-${image.id}`}
											name="focalY"
											type="number"
											step="0.05"
											min="0"
											max="1"
											defaultValue={image.focalY}
										/>
									</div>
								</div>

								<div className="form-actions">
									<button type="submit" className="btn-primary">
										Save
									</button>
								</div>
							</form>

							<form action={deleteImage} className="mt-2">
								<input type="hidden" name="pieceId" value={piece.id} />
								<input type="hidden" name="imageId" value={image.id} />
								<button type="submit" className="btn-small btn-ending">
									Delete this photograph
								</button>
							</form>
						</li>
					))}
					{images.length === 0 && <li className="meta">None yet.</li>}
				</ul>
			</section>

			{/* ── Options ───────────────────────────────────────────────────── */}
			<section className="panel">
				<h2>Options</h2>
				<p className="meta mb-3">
					A piece with one cut asks no question. Nobody classifies themselves to buy a hat, so
					there is no gender here.
				</p>

				<ul className="rows">
					{options.map((option) => (
						<li key={option.id}>
							<span className="tag">{option.group}</span>
							<span className="font-medium">{option.label}</span>
							{/* Zero on most, negative where he wants it *(R3)* — so the
							    total on the button is always the real one. */}
							<span className="money meta">{option.priceModifier}</span>
							<span className="meta">
								{option.available ? "offered" : "not offered today"}
							</span>
							<form action={toggleOption} className="row-end">
								<input type="hidden" name="pieceId" value={piece.id} />
								<input type="hidden" name="optionId" value={option.id} />
								<button type="submit" className="btn-small">
									{option.available ? "Stop offering it" : "Offer it again"}
								</button>
							</form>
						</li>
					))}
					{options.length === 0 && <li className="meta">None.</li>}
				</ul>

				<form action={addOption} className="fields mt-5">
					<input type="hidden" name="pieceId" value={piece.id} />
					<div className="fields-row" style={{ "--cols": 3 } as React.CSSProperties}>
						<div>
							<label htmlFor="group">Which question</label>
							<select id="group" name="group" defaultValue="colourway">
								<option value="colourway">colourway</option>
								<option value="cut">cut</option>
								<option value="size">size</option>
							</select>
						</div>
						<div>
							<label htmlFor="label">Label</label>
							<input id="label" name="label" type="text" required />
						</div>
						<div>
							<label htmlFor="priceModifier">What it adds</label>
							<input id="priceModifier" name="priceModifier" type="number" defaultValue={0} />
						</div>
					</div>
					<div className="form-actions">
						<button type="submit" className="btn-primary">
							Add it
						</button>
					</div>
				</form>
			</section>

			{/* ── State ─────────────────────────────────────────────────────── */}
			<section className="panel">
				<h2>On the site</h2>

				{/*
				 * Publishing is the deliberate act with a floor behind it *(R9b)*, so
				 * it is the filled button. Taking a piece off is not an ending — it is
				 * reversible in one click and the orders still resolve — so it is an
				 * ordinary one, and only the hard delete is styled as a consequence.
				 */}
				<div className="form-actions mt-0!">
					{piece.state !== "live" ? (
						<form action={publishPiece}>
							<input type="hidden" name="pieceId" value={piece.id} />
							<button type="submit" className="btn-primary">
								Publish it
							</button>
						</form>
					) : (
						<form action={setState}>
							<input type="hidden" name="pieceId" value={piece.id} />
							<input type="hidden" name="state" value="removed" />
							<button type="submit">Take it off the site</button>
						</form>
					)}

					{piece.state === "removed" && (
						// **Reversible in one click** *(R1)* — he will bring pieces back.
						<form action={setState}>
							<input type="hidden" name="pieceId" value={piece.id} />
							<input type="hidden" name="state" value="live" />
							<button type="submit">Bring it back</button>
						</form>
					)}
				</div>

				{/*
				 * **Hard delete only where no order exists** *(R1)*. Same button,
				 * behaviour decided by the data rather than by him remembering a rule —
				 * and the button says which of the two it is today, so it is disabled
				 * by its own words rather than by an attribute that hides the reason.
				 */}
				<form action={deletePiece} className="mt-6 border-t border-(--canvas-edge) pt-4">
					<input type="hidden" name="pieceId" value={piece.id} />
					<button type="submit" className="btn-small btn-ending">
						{orderCount === 0
							? "Delete it for good"
							: `Cannot be deleted — ${orderCount} order${orderCount === 1 ? "" : "s"}`}
					</button>
				</form>
			</section>
		</main>
	);
}
