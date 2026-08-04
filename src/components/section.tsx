import type { ReactNode } from "react";

/**
 * A section of a page, and **the colour law expressed as an API** *(foundation
 * §2, CLAUDE.md)*.
 *
 * > *Strong colour and garment photos never share a section. Any section
 * > containing a product photo is on cream. The three cloth colours are only for
 * > sections with no garment in them. The clothes must always be the
 * > highest-contrast thing on the page.*
 *
 * Written as a rule in a document, that gets broken in month four by someone who
 * has not read the document. So the shape of the props carries it instead:
 *
 * - **Cream is the default and costs nothing to choose.** A section that says
 *   nothing is cream and ink, which is ~85% of the real site.
 * - **A cloth tone cannot be chosen absent-mindedly.** `tone="tan"` alone is a
 *   type error; it must be written `tone="tan" garmentFree`, which is the author
 *   asserting the thing the law actually requires. It is still possible to lie,
 *   but not possible to do it by accident, and the lie is one word long and
 *   sitting in the diff.
 * - **There is no wine.** Wine is a thread — a stitch, an underline, a border, a
 *   rule — so it is not offered here as a ground at all. `Stitch` below is what
 *   wine is for.
 *
 * The section is also the unit the scroll reveal moves *(motion.md §3 —
 * "section-level, never paragraph-level")*, so `data-section` is emitted here
 * rather than remembered per page. Its direct children stagger in DOM order:
 * heading, then body, then image.
 */

/** The three warm tones. Cloth. Only ever in a section with no garment in it. */
type ClothTone = "hill" | "tan" | "udongo";

const GROUND: Record<ClothTone | "cream", string> = {
	cream: "bg-cream text-ink",
	// On cloth, the type goes to cream — the ink would disappear into the hill.
	hill: "bg-hill text-cream",
	tan: "bg-tan text-ink",
	udongo: "bg-udongo text-ink",
};

type SectionProps = {
	children: ReactNode;
	className?: string;
	id?: string;
	/**
	 * Opt out of the scroll reveal, for a section that must never move — the
	 * first thing on a page, or anything a reveal would fight with.
	 */
	still?: boolean;
	/** `<section>` unless the page needs something else. */
	as?: "section" | "div" | "header" | "footer";
	"aria-labelledby"?: string;
} & (
	| { tone?: "cream"; garmentFree?: never }
	| {
			tone: ClothTone;
			/**
			 * **Assert it: there is no garment photograph in this section.** The
			 * prop is required on a cloth tone and exists only to be written down.
			 */
			garmentFree: true;
	  }
);

export function Section({
	children,
	className = "",
	id,
	still = false,
	as: Tag = "section",
	tone = "cream",
	...rest
}: SectionProps) {
	return (
		<Tag
			id={id}
			className={`${GROUND[tone]} ${className}`}
			// Absent on a still section, which is what leaves it out of the reveal
			// entirely rather than revealing it instantly.
			{...(still ? {} : { "data-section": "" })}
			aria-labelledby={rest["aria-labelledby"]}
		>
			{children}
		</Tag>
	);
}

/**
 * The running stitch, still.
 *
 * **Dividers are sketched, not locked** — motion.md holds the marching version
 * behind propose-before-build, and this is the still one Phase 6 will animate.
 * The dash geometry lives in `--stitch` so that what moves later is this stitch
 * and not a second one that looks nearly the same.
 *
 * `role="presentation"` because it divides visually and says nothing: a screen
 * reader announcing "separator" between every block on the page is noise, and
 * the headings already carry the structure.
 */
export function Stitch({ className = "" }: { className?: string }) {
	return <hr role="presentation" className={`stitch-rule ${className}`} />;
}
