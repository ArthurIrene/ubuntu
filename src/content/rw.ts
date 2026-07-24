import type { Translation } from "./en";

// The founder has written no Kinyarwanda yet, so every value is null and the
// resolver falls back to English. As he writes, values here replace the
// fallback one key at a time. The keys are required — a new English string
// cannot be forgotten here, only deliberately left null.
export const rw: Translation = {
	title: null,
	wordmark: null,
	line: null,
	handles: null,
};
