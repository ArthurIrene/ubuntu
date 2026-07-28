// The storage adapter. This is the only module that may talk to a file store —
// components, pages and route handlers import from here and never reach for a
// storage SDK.
//
// Public and private are two buckets, not one bucket with a naming convention:
// the boundary is enforced by the store, not by us remembering.
//
// ## It is pointed at Supabase Storage, and R2 is still the plan
//
// `ubuntu-technical.md` §4 named this exactly: *R2 may require a payment method
// on file even for the free tier — test this on day one. If R2 cannot be
// enabled, launch on Supabase Storage and let the storage adapter absorb the
// swap later.* R2 is not enabled, so this is that fallback, taken deliberately
// and on the free tier of a project we already have.
//
// **The named cost.** §3's split — *Supabase holds the database and auth; it
// does not hold files, and it does not serve images* — is the thing being
// suspended, not repealed. Serving catalogue photos through Supabase spends its
// metered egress where R2 has none, which is precisely why content-hashed keys
// and `immutable` cache headers matter more here than they would on R2: a
// repeat view must never come back to the origin. The swap is this file and two
// environment variables, which is what the adapter was for.

import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Which bucket a file lives in, and the whole of the public/private decision.
 *
 * A public bucket serves anything in it to anyone holding the URL. That is
 * right for catalogue photos and wrong for a customer's reference image or a
 * progress shot, which are read back through the Worker behind the order token.
 *
 * Not a boolean: `upload("private", …)` says at the call site what
 * `upload(false, …)` would only say in the signature, and there is no
 * defaulting — every call names its bucket.
 */
export type Bucket = "public" | "private";

/**
 * Where to hold a crop, as fractions of the image's own width and height —
 * 0–1, `{ x: 0.5, y: 0.5 }` being dead centre.
 *
 * Cards crop 4:5 with `object-fit: cover`, and the focal point is what stops
 * that crop beheading people. Chosen in the dashboard, stored with the record.
 */
export interface FocalPoint {
	x: number;
	y: number;
}

/**
 * An image as the app passes it around: what it takes to place the picture
 * before the picture arrives.
 *
 * Width and height are stored, never measured at runtime, so every image
 * reserves its space before it loads — a page that shifts as photos arrive
 * breaks the reveals underneath them, which makes layout shift a motion bug
 * here rather than a metric.
 */
export interface StoredImage {
	/** The object key within its bucket. Says nothing about which bucket. */
	key: string;
	/** Intrinsic width in pixels, as stored. */
	width: number;
	/** Intrinsic height in pixels, as stored. */
	height: number;
	/** Where to hold the crop. */
	focal: FocalPoint;
}

/**
 * Every file operation the app is allowed to perform. Implemented once;
 * imported everywhere else.
 */
export interface Storage {
	/**
	 * Store a file, replacing anything already at that key.
	 *
	 * `body` is what a Worker actually has in hand — an `ArrayBuffer` it has
	 * read, or a `ReadableStream` it can pass through. Never a Node `Buffer`:
	 * this runs in the Workers runtime, where there is no such thing.
	 *
	 * Callers are already past validation. Derivatives arrive here resized,
	 * compressed and encoded to WebP in the browser; no original is kept.
	 */
	upload(
		bucket: Bucket,
		key: string,
		body: ArrayBuffer | ReadableStream,
		contentType: string,
	): Promise<void>;

	/**
	 * The URL a browser fetches a public object from.
	 *
	 * Synchronous, because it is string work: this is what lets a Server
	 * Component build a `srcset` without awaiting anything.
	 *
	 * Public bucket only. A private key has no public URL by design — that is
	 * the point of the split, so passing one here is a bug, not a variant. Read
	 * private objects with {@link Storage.streamPrivate}.
	 */
	publicUrl(key: string): string;

	/**
	 * Read a private object, to be streamed back through the Worker. `null`
	 * when no object exists at that key, so a missing file is a 404 the caller
	 * shapes rather than an exception it has to catch.
	 *
	 * **Authorisation is the caller's job, not this layer's.** This resolves a
	 * key; it does not ask who wants it. The route handler checks the order
	 * token first and only then calls here.
	 */
	streamPrivate(key: string): Promise<ReadableStream | null>;

	/**
	 * Remove an object. Absent keys are not an error — deleting twice is the
	 * same outcome as deleting once.
	 */
	delete(bucket: Bucket, key: string): Promise<void>;
}

/**
 * The two buckets, by name.
 *
 * Overridable so a second environment does not write into the first one's
 * files, and defaulted so nothing has to be configured to work.
 */
function bucketName(bucket: Bucket): string {
	const env = settings();
	return bucket === "public"
		? (env.STORAGE_PUBLIC_BUCKET ?? "ubuntu-public")
		: (env.STORAGE_PRIVATE_BUCKET ?? "ubuntu-private");
}

function settings(): Record<string, string | undefined> {
	return getCloudflareContext().env as unknown as Record<string, string | undefined>;
}

function endpoint(): { url: string; headers: Record<string, string> } {
	const env = settings();
	const url = env.SUPABASE_URL;
	const key = env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) throw new Error("storage: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set");

	// **Both headers, and the `apikey` one is not redundant.** Supabase's newer
	// `sb_secret_…` keys are opaque strings rather than JWTs, and Storage
	// validates a lone `Authorization` header as a compact JWS — which an opaque
	// key is not, so it answers *Invalid Compact JWS* and nothing uploads. The
	// `apikey` header is what identifies the key as a project key. Found by
	// running it; the auth endpoints happen to accept either, so this only
	// surfaces here.
	return {
		url: url.replace(/\/$/, ""),
		headers: { apikey: key, Authorization: `Bearer ${key}` },
	};
}

/**
 * A year, immutable.
 *
 * **The highest-value free decision in the image section** *(R8)*: keys are
 * content-hashed, so an object at a given key never changes, and a repeat view
 * never comes back to the origin. It matters more on Supabase Storage than it
 * would on R2, because here reads are metered bandwidth.
 */
const IMMUTABLE = "public, max-age=31536000, immutable";

export const storage: Storage = {
	async upload(bucket, key, body, contentType) {
		const { url, headers } = endpoint();

		const response = await fetch(
			`${url}/storage/v1/object/${bucketName(bucket)}/${encodeURI(key)}`,
			{
				method: "POST",
				headers: {
					...headers,
					"Content-Type": contentType,
					"Cache-Control": IMMUTABLE,
					// Re-uploading the same content-hashed key is the same bytes, so
					// an overwrite is a no-op rather than a conflict.
					"x-upsert": "true",
				},
				body,
			},
		);

		if (!response.ok) {
			throw new Error(`storage: upload refused (${response.status})`);
		}
	},

	publicUrl(key) {
		const env = settings();
		const url = (env.SUPABASE_URL ?? "").replace(/\/$/, "");
		return `${url}/storage/v1/object/public/${bucketName("public")}/${encodeURI(key)}`;
	},

	async streamPrivate(key) {
		const { url, headers } = endpoint();
		const response = await fetch(
			`${url}/storage/v1/object/${bucketName("private")}/${encodeURI(key)}`,
			{ headers },
		);
		if (!response.ok || !response.body) return null;
		return response.body;
	},

	async delete(bucket, key) {
		const { url, headers } = endpoint();
		await fetch(`${url}/storage/v1/object/${bucketName(bucket)}/${encodeURI(key)}`, {
			method: "DELETE",
			headers,
		});
		// A missing object is not an error. Deleting twice is the same outcome as
		// deleting once, and a 404 here would only ever be noise.
	},
};
