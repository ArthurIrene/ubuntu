import localFont from "next/font/local";

/**
 * The three faces *(foundation §9)*.
 *
 * > *"The handwritten script stays sacred — logo only, plus one closing mark per
 * > page. Around it, a warm literary serif for headings and a clean humanist
 * > sans-serif for body and forms. No decorative 'African-themed' display fonts."*
 *
 * **Self-hosted from files in this repo.** `next/font/local` rather than
 * `next/font/google`: the Google helper self-hosts the *output* but still fetches
 * the *input* at build time, which makes every build depend on a third party
 * being up. The files are committed instead — see `src/fonts/README.md` for how
 * they were subset and why the Fraunces pair is half the size Google serves.
 *
 * Each call exposes a CSS variable rather than a class, so `globals.css` owns
 * which face is used where and no component has to import a font to have one.
 *
 * `adjustFontFallback` is on by default and is doing real work: Next measures the
 * face and synthesises a `size-adjust`ed fallback with matching metrics, so the
 * swap from Georgia to Fraunces does not move the line it is in. **Layout shift
 * is a motion bug here, not a performance metric** *(motion.md)* — and a shift
 * caused by a font arriving is the same bug as one caused by a photo arriving.
 */

/**
 * Headings. **The display face, and the only one preloaded.**
 */
export const serif = localFont({
	src: "../fonts/fraunces-latin.woff2",
	weight: "300 700",
	style: "normal",
	variable: "--font-fraunces",
	display: "swap",
	fallback: ["Georgia", "Times New Roman", "serif"],
});

/**
 * The same face slanted: the scene line, and the maxim at the foot of every page.
 *
 * **A separate declaration, purely so that it does not preload.** Written as one
 * family with two `src` entries — which is the tidier way and the way this file
 * first did it — `next/font` preloads every file in the array, putting 55 KB at
 * the head of the queue on a metered connection to render one line of italic
 * that is usually below the fold. Two declarations buy the ability to say no.
 *
 * The cost, named: `font-style: italic` no longer selects this file on its own,
 * so italic here is the `.serif-italic` class in `globals.css` and not a bare
 * `<em>`. That is two places on the site, both of them deliberate.
 */
export const serifItalic = localFont({
	src: "../fonts/fraunces-italic-latin.woff2",
	weight: "300 700",
	style: "italic",
	variable: "--font-fraunces-italic",
	display: "swap",
	preload: false,
	fallback: ["Georgia", "Times New Roman", "serif"],
});

/** Body, forms, and every number a customer types. */
export const sans = localFont({
	src: "../fonts/instrument-sans-latin.woff2",
	weight: "400 700",
	style: "normal",
	variable: "--font-instrument",
	display: "swap",
	fallback: ["ui-sans-serif", "system-ui", "Segoe UI", "Helvetica Neue", "Arial", "sans-serif"],
});

/**
 * **The wordmark, and one closing mark per page. Never body text, never a
 * heading** *(CLAUDE.md, foundation §9)*.
 *
 * `preload: false` deliberately. It renders two short strings on a page — the
 * wordmark in the header and the footer's closing mark — and preloading it would
 * put 23 KB in front of the body face on a metered connection to hurry a
 * decorative mark. It swaps in from the fallback a beat later, which is the right
 * trade in Kigali.
 */
export const script = localFont({
	src: "../fonts/sacramento-latin.woff2",
	weight: "400",
	style: "normal",
	variable: "--font-sacramento",
	display: "swap",
	preload: false,
	fallback: ["cursive"],
});

/** Every face's variable, for the `<html>` element. */
export const fontVariables = [
	serif.variable,
	serifItalic.variable,
	sans.variable,
	script.variable,
].join(" ");
