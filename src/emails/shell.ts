// The one shape every email we send has.
//
// **Email bodies are code, not dashboard fields** *(R9d)*. A body edited in the
// dashboard has no key and no translation, so it silently becomes English-only
// and the Round 14 flip bar cannot count what it does not know exists. What he
// gets instead is a personal note, on the four emails where a note earns its
// place.
//
// ## Why the palette is repeated here
//
// `CLAUDE.md` forbids a hard-coded hex in a component, and this is not a
// component. Mail clients do not resolve CSS custom properties and several
// strip `<style>` blocks entirely, so an email's colour has to be an inline
// literal or it is nothing. The rule's intent — **defined once** — is kept by
// defining them once *here*, named after the tokens they mirror, rather than by
// spreading them through nine templates.

/** The design tokens, as the only form a mail client will honour. */
const TOKEN = {
	cream: "#F5F0E8",
	ink: "#1A1208",
	wine: "#4E2728",
} as const;

/**
 * A rendered message body, before it is addressed.
 *
 * Two forms of the same message. The plain-text half is written for every
 * email, not generated from the HTML: it is what preview panes and text-only
 * readers show, and an HTML-only message looks weaker to a spam filter.
 */
export interface Body {
	html: string;
	text: string;
}

/**
 * What a template hands the shell.
 *
 * `paragraphs` are already in the recipient's locale. `note` is the founder's
 * personal line, which appears on four emails only and **must leave the layout
 * whole when it is empty** *(R9d)* — hence the null-guard rather than an empty
 * paragraph.
 */
export interface Content {
	/** Not rendered as a heading; used as the preheader line. */
	preview: string;
	paragraphs: string[];
	action?: { label: string; url: string };
	/** His own words, above the signature. Null on the five that carry none. */
	note?: string | null;
	/** The sign-off, in the recipient's locale. */
	signature: string;
}

const escapeHtml = (value: string): string =>
	value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");

/**
 * Wrap content in the shell.
 *
 * Table-based and inline-styled because that is what mail clients render, and
 * deliberately plain: **design is Phase 5**, and inventing a look here would be
 * a second design direction to reconcile later.
 */
export function shell(content: Content): Body {
	const paragraphs = content.paragraphs
		.map(
			(line) =>
				`<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${TOKEN.ink};">${escapeHtml(line)}</p>`,
		)
		.join("");

	const action = content.action
		? `<p style="margin:24px 0;"><a href="${escapeHtml(content.action.url)}" style="color:${TOKEN.wine};font-size:16px;">${escapeHtml(content.action.label)}</a></p>`
		: "";

	// An empty note leaves the layout whole. That is the requirement, and it is
	// why this is a conditional block rather than a paragraph that renders blank.
	const note = content.note?.trim()
		? `<div style="margin:24px 0;padding-left:16px;border-left:2px solid ${TOKEN.wine};">${content.note
				.trim()
				.split(/\n+/)
				.map(
					(line) =>
						`<p style="margin:0 0 12px;font-size:16px;line-height:1.6;color:${TOKEN.ink};">${escapeHtml(line)}</p>`,
				)
				.join("")}</div>`
		: "";

	const html = `<!doctype html>
<html lang="en"><body style="margin:0;padding:0;background:${TOKEN.cream};">
<span style="display:none;max-height:0;overflow:hidden;">${escapeHtml(content.preview)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${TOKEN.cream};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td style="font-family:Georgia,'Times New Roman',serif;">
${paragraphs}${action}${note}
<p style="margin:32px 0 0;font-size:16px;line-height:1.6;color:${TOKEN.ink};">${escapeHtml(content.signature)}</p>
</td></tr></table>
</td></tr></table>
</body></html>`;

	const text = [
		...content.paragraphs,
		content.action ? `${content.action.label}: ${content.action.url}` : null,
		content.note?.trim() || null,
		content.signature,
	]
		.filter((part): part is string => Boolean(part))
		.join("\n\n");

	return { html, text };
}
