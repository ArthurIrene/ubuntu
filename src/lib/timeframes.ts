// What a customer is told about time.
//
// **Priority is position in the queue, never speed** *(R4)*. The data model
// cannot express *we stitch it faster* — priority moves the global offset and
// never a piece's making days — and this is where that reaches the page: both
// numbers are the same making days plus a different offset.
//
// Pure, so the one rule that has to hold can be tested without a database.

import type { SiteSettings } from "./catalogue";

export interface Timeframes {
	/** Making days plus the global queue offset. */
	standardDays: number | null;
	/**
	 * Making days plus the priority offset — **or null, meaning the option is not
	 * offered.**
	 *
	 * The priority option renders only while the queue offset is non-zero. With an
	 * empty queue there is no position to buy, and offering one on a site with four
	 * pieces and no orders would be the first piece of scarcity copy on it. The
	 * modifier and the offset exist from day one; the words wait for the queue.
	 */
	priorityDays: number | null;
}

export function timeframes(
	makingDays: number | null,
	settings: Pick<SiteSettings, "queueOffsetDays" | "priorityOffsetDays">,
): Timeframes {
	// Making days is on the publish floor, so a live piece always has one. Null
	// here means a draft, and a draft says nothing about time rather than
	// inventing a number.
	if (makingDays === null) return { standardDays: null, priorityDays: null };

	return {
		standardDays: makingDays + settings.queueOffsetDays,
		priorityDays:
			settings.queueOffsetDays === 0 ? null : makingDays + settings.priorityOffsetDays,
	};
}
