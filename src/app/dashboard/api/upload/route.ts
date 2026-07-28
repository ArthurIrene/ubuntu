// The upload endpoint. **Never exposed unauthenticated** — it sits under
// `/dashboard`, which is the session cookie's path, and it re-runs the gate
// itself rather than trusting that it is only ever reached from a page.
//
// **Uploads pass through the Worker** to the storage adapter *(R8)*. That is
// viable because the browser has already turned 12 MB into about 300 KB, and it
// keeps knowledge of the store in one file — no presigned URLs, no second
// module that knows what a bucket is. A small upload also survives a flaky
// connection where a large one restarts at 90%.

import { eq } from "drizzle-orm";

import { getDb, schema } from "@/db/client";
import { requireSession } from "@/lib/auth";
import { derivativeKey } from "@/lib/image-loader";
import { storage } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * What a derivative may be.
 *
 * Verified by **file signature**, not by extension or by the browser's claimed
 * content type — both are strings anyone can write. Two formats, because the
 * pipeline encodes WebP and falls back to JPEG where a browser cannot.
 */
const SIGNATURES: { type: string; test: (bytes: Uint8Array) => boolean }[] = [
	{
		type: "image/webp",
		// RIFF....WEBP
		test: (b) =>
			b.length > 12 &&
			b[0] === 0x52 &&
			b[1] === 0x49 &&
			b[2] === 0x46 &&
			b[3] === 0x46 &&
			b[8] === 0x57 &&
			b[9] === 0x45 &&
			b[10] === 0x42 &&
			b[11] === 0x50,
	},
	{
		type: "image/jpeg",
		test: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
	},
];

/**
 * A ceiling, in bytes, per derivative.
 *
 * A 1600 px WebP off this pipeline is a few hundred kilobytes. Two megabytes is
 * generous enough never to refuse a real photograph and tight enough that the
 * endpoint is not a place to park a file.
 */
const MAX_BYTES = 2 * 1024 * 1024;

/** Content-hashed keys, so an object at a key never changes and can be `immutable` *(R8)*. */
async function contentHash(bytes: ArrayBuffer): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", bytes);
	return Array.from(new Uint8Array(digest).slice(0, 16))
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

export async function POST(request: Request): Promise<Response> {
	await requireSession();

	const form = await request.formData();
	const kind = String(form.get("kind") ?? "");
	const targetId = String(form.get("targetId") ?? "");
	const width = Number(form.get("width") ?? 0);
	const height = Number(form.get("height") ?? 0);

	if (!targetId || !Number.isFinite(width) || !Number.isFinite(height) || width < 1) {
		return Response.json({ error: "bad request" }, { status: 400 });
	}

	// Every part that looks like a derivative, validated before anything is
	// written anywhere.
	const parts: { width: number; bytes: ArrayBuffer; type: string }[] = [];
	for (const [field, value] of form.entries()) {
		if (!field.startsWith("w") || typeof value === "string") continue;

		const derivativeWidth = Number(field.slice(1));
		if (!Number.isFinite(derivativeWidth)) continue;

		const bytes = await value.arrayBuffer();
		if (bytes.byteLength > MAX_BYTES) {
			return Response.json({ error: "too large" }, { status: 413 });
		}

		const head = new Uint8Array(bytes.slice(0, 16));
		const signature = SIGNATURES.find((candidate) => candidate.test(head));
		if (!signature) {
			return Response.json({ error: "not an image we made" }, { status: 415 });
		}

		parts.push({ width: derivativeWidth, bytes, type: signature.type });
	}

	if (parts.length === 0) return Response.json({ error: "nothing to store" }, { status: 400 });

	// The base key is the hash of the largest derivative, so identical photos
	// land on the same key and re-uploading one is free.
	const largest = parts.reduce((big, part) => (part.width > big.width ? part : big), parts[0]);
	const base = await contentHash(largest.bytes);

	const db = await getDb();

	if (kind === "piece") {
		const [piece] = await db
			.select({ sceneLine: schema.pieces.sceneLine })
			.from(schema.pieces)
			.where(eq(schema.pieces.id, targetId))
			.limit(1);
		if (!piece) return Response.json({ error: "no such piece" }, { status: 404 });

		for (const part of parts) {
			// **Catalogue photos go to the public bucket** and are served direct.
			await storage.upload("public", derivativeKey(base, part.width), part.bytes, part.type);
		}

		// **Alt text is required, defaulting to the piece's scene line** *(R8)*.
		// Not null "usually filled in": the default is applied when the row is
		// written, so there is no path that produces an image without one.
		const alt = String(form.get("alt") ?? "").trim() || piece.sceneLine || "A piece by Ubuntu";

		await db.insert(schema.pieceImages).values({
			pieceId: targetId,
			storageKey: base,
			width,
			height,
			alt,
		});

		return Response.json({ ok: true, key: base });
	}

	if (kind === "progress") {
		for (const part of parts) {
			// **Never the public bucket** *(R8)*. A progress photo is streamed back
			// through the Worker with the order token checked.
			await storage.upload("private", derivativeKey(base, part.width), part.bytes, part.type);
		}

		await db.insert(schema.orderImages).values({
			orderId: targetId,
			kind: "progress",
			storageKey: base,
			width,
			height,
		});

		return Response.json({ ok: true, key: base });
	}

	return Response.json({ error: "unknown kind" }, { status: 400 });
}
