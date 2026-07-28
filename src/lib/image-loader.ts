// The `next/image` loader. **A URL mapper, not a transformer** *(R8)*.
//
// Next's default loader asks the hosting platform to resize on demand, and
// there is no such platform here: the Workers free plan allows 10ms of CPU per
// request, `sharp` does not run in the runtime at all, and the WASM codecs that
// do run count against the same 3 MiB the whole app must fit inside. So the
// derivatives are made in the browser at upload time, and this maps a requested
// width to the nearest one that exists.
//
// `next/image` is kept for `srcset`, lazy loading and layout stability, and for
// nothing else.

import { storage } from "./storage";

/**
 * The three derivatives, in pixels *(R8)*.
 *
 * Progress photos get one at 1000 px instead — private, behind the token, where
 * posting speed matters more than polish. That size is not in this list because
 * a private image is never served through this loader.
 */
export const DERIVATIVES = [400, 800, 1600] as const;

export type Derivative = (typeof DERIVATIVES)[number];

/** The one derivative for a progress photo. */
export const PROGRESS_WIDTH = 1000;

/**
 * The smallest derivative at least as wide as the request, or the largest we
 * have.
 *
 * Rounding **up** rather than to the nearest: a photograph shown slightly
 * larger than its pixels is the one visible failure mode on a garment site, and
 * the difference in bytes between two adjacent derivatives is far smaller than
 * the difference between a sharp piece and a soft one.
 */
export function nearestDerivative(width: number): Derivative {
	return DERIVATIVES.find((size) => size >= width) ?? DERIVATIVES[DERIVATIVES.length - 1];
}

/** The object key for one derivative of a content-hashed base key. */
export function derivativeKey(base: string, width: number): string {
	return `${base}/${width}.webp`;
}

/**
 * The loader `next/image` calls.
 *
 * `quality` is accepted and ignored: quality was decided in the browser when
 * the file was encoded, and there is nothing here that could apply a second
 * one. Taking the parameter and doing nothing with it is what keeps
 * `next/image` working without implying a capability that does not exist.
 */
export default function imageLoader({ src, width }: { src: string; width: number }): string {
	return storage.publicUrl(derivativeKey(src, nearestDerivative(width)));
}
