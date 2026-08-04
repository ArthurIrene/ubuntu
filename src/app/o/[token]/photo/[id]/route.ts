import { and, eq } from "drizzle-orm";

import { getDb, schema } from "@/db/client";
import { storage } from "@/lib/storage";

// One progress photograph, streamed through the Worker with the order token
// checked *(R8)*.
//
// **Two buckets, not one bucket with a naming convention.** Catalogue photos are
// public, content-hashed and served direct on their own hostname. Everything
// attached to an order is private and comes through here, because a public
// bucket serves anything in it to anyone holding the URL — and the whole point
// of these files is that only one person may hold it.
//
// The token gates the image exactly as it gates the page. **Never a customer
// image from the public bucket**, and never a signed public URL either: a signed
// URL outlives the check that produced it, and this one does not.

export const dynamic = "force-dynamic";

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ token: string; id: string }> },
): Promise<Response> {
	const { token, id } = await params;
	const db = await getDb();

	/*
	 * **The join is the authorisation.** The image is looked up by its own id
	 * *and* by the token of the order it hangs off, in one predicate — so an id
	 * belonging to somebody else's order simply does not match, rather than
	 * matching and then being checked. There is no ordering of two conditions to
	 * get wrong, and no path where a row is loaded before permission is decided.
	 */
	const [image] = await db
		.select({ storageKey: schema.orderImages.storageKey })
		.from(schema.orderImages)
		.innerJoin(schema.orders, eq(schema.orders.id, schema.orderImages.orderId))
		.where(
			and(
				eq(schema.orderImages.id, id),
				eq(schema.orders.token, token),
				// Progress photos only. A customer's own reference image unlocks in
				// Phase 8; until then there is no path that serves one.
				eq(schema.orderImages.kind, "progress"),
			),
		)
		.limit(1);

	// Wrong token, wrong id, or an id that belongs to another order: all 404, and
	// all indistinguishable. A different answer for *exists but not yours* is an
	// oracle for enumerating other people's photographs.
	if (!image) return new Response(null, { status: 404 });

	const body = await storage.streamPrivate(image.storageKey);
	if (!body) return new Response(null, { status: 404 });

	return new Response(body, {
		headers: {
			"Content-Type": "image/webp",
			/*
			 * **`private`, and never a shared cache.** A CDN or a proxy caching this
			 * would serve it on the key of a URL that carries the credential, which
			 * is how one person's photograph reaches a second person's browser.
			 * Short and revalidating, so a photo he removes stops being served.
			 */
			"Cache-Control": "private, max-age=300, must-revalidate",
			// Belt and braces beside the middleware, because a file response is the
			// one that gets fetched from somewhere unexpected.
			"Referrer-Policy": "no-referrer",
			"X-Robots-Tag": "noindex, nofollow",
		},
	});
}
