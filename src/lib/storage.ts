// The storage adapter. This is the only module that may talk to R2 —
// components, pages and route handlers import from here and never reach for a
// storage SDK.
//
// Public and private are two buckets, not one bucket with a naming convention:
// the boundary is enforced by R2, not by us remembering.
//
// Interface only. R2 is not enabled yet, so every method throws — a seam the
// rest of the app can import and type against before the body exists.

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
 *
 * Nothing on this shape is derived from the file when it is read. The
 * dimensions and the focal point are settled at upload, in the browser, and
 * travel with the database row from then on.
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
 * Every file operation the app is allowed to perform. Implemented once,
 * against R2; imported everywhere else.
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
	 * The URL a browser fetches a public object from, on the custom R2 domain —
	 * never the `r2.dev` address, which is rate-limited and not for production
	 * traffic.
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
 * The single body every method has until R2 is switched on. One thrower, so
 * the real implementation replaces bodies and leaves the signatures above
 * untouched.
 *
 * Returns `never`, which is why it satisfies each method's return type without
 * any of them resolving to a fake success.
 */
function notImplemented(): never {
	throw new Error(
		"storage: not implemented — R2 not yet enabled (Phase 1 / weekend)",
	);
}

/**
 * The adapter instance. The app imports this; when R2 is enabled, the bodies
 * below are filled in and nothing that imports them changes.
 */
export const storage: Storage = {
	upload: notImplemented,
	publicUrl: notImplemented,
	streamPrivate: notImplemented,
	delete: notImplemented,
};
