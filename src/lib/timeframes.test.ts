import { describe, expect, it } from "vitest";
import { timeframes } from "./timeframes";

const offsets = (queueOffsetDays: number, priorityOffsetDays: number) => ({
	queueOffsetDays,
	priorityOffsetDays,
});

describe("timeframes", () => {
	it("is a piece's making days plus the global queue offset", () => {
		expect(timeframes(14, offsets(7, 2)).standardDays).toBe(21);
	});

	it("does not offer priority while the queue offset is zero", () => {
		// With an empty queue there is no position to buy, and offering one would be
		// the first piece of scarcity copy on the site.
		expect(timeframes(14, offsets(0, 0)).priorityDays).toBeNull();
		expect(timeframes(14, offsets(0, 3)).priorityDays).toBeNull();
	});

	it("offers priority as a smaller offset, never as smaller making days", () => {
		const { standardDays, priorityDays } = timeframes(14, offsets(10, 2));
		expect(standardDays).toBe(24);
		expect(priorityDays).toBe(16);
		// The promise that cannot be broken: the piece itself takes as long either
		// way. Both numbers carry the same 14 days of stitching.
		expect(standardDays! - 10).toBe(priorityDays! - 2);
	});

	it("says nothing about time when a piece has no making days", () => {
		// Only reachable on a draft — making days is on the publish floor.
		expect(timeframes(null, offsets(7, 2))).toEqual({
			standardDays: null,
			priorityDays: null,
		});
	});
});
