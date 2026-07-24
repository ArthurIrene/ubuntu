// English is canonical — the source of both the copy and the shape. Every other
// locale is a translation overlaid on this. Bracketed values are unanswered
// founder questions; they stay visible until his words land.
export const en = {
	title: "[name]",
	wordmark: "[name]",
	line: "[line]",
	handles: ["[handle]", "[handle]"],
};

// The shape every locale resolves to.
export type Content = typeof en;

// A locale overlay names every key of the source. A value is the translation,
// or null where the founder has not written it yet. Because every key is
// required, adding a key to `en` forces a matching entry in each translation —
// a new string can never be silently left untranslated.
export type Translation = { [K in keyof Content]: Content[K] | null };
