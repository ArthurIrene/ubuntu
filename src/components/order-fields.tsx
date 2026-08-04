import type { Content } from "@/content/en";
import type { Locale } from "@/lib/locale";
import type { OrderError } from "@/lib/order-create";

// The fields both order forms ask for, written once.
//
// The two forms create the same object *(R6 — a collection order is a commission
// with one gate)*, so the part that identifies a person should be the same
// fields in the same order asking in the same words. Two copies of this block
// is two places for *email and phone are both required* to stop being true.
//
// **Server Components, and no client JavaScript anywhere in this file.** The
// form completes with no JS, no motion and a screen reader *(R7)*; every
// `required`, `type` and `autoComplete` below is the browser doing that work
// natively, which is the only version that survives a dead connection.
//
// Unstyled. Phase 5 owns how any of this looks.

/**
 * The refusal, as a sentence.
 *
 * Rendered above the form rather than beside the field, because without
 * JavaScript the page has been reloaded and the reader needs to be told what
 * happened before they are asked to look for it. Field-level placement and
 * preserved answers are Phase 5's, with the design.
 */
export function OrderRefusal({ error, copy }: { error?: string; copy: Content["order"] }) {
	if (!error) return null;

	const messages: Record<OrderError, string> = {
		name: copy.errors.name,
		email: copy.errors.email,
		phone: copy.errors.phone,
		scene: copy.errors.scene,
		piece: copy.errors.piece,
		channel: copy.errors.channel,
		// The fit refusals are worded per field and render beside the input that
		// carries them; this is the line at the top that sends them looking.
		fit: copy.errors.fit,
		unknown: copy.errors.unknown,
	};
	const message = messages[error as OrderError] ?? copy.errors.unknown;

	return (
		// `alert` so a screen reader is told without having to go looking, and
		// `tabIndex` so the reader can be sent here. Both are markup, not script.
		<div role="alert" tabIndex={-1}>
			<p>{copy.errors.heading}</p>
			<p>{message}</p>
		</div>
	);
}

/**
 * Who they are and where he writes. **Email and phone are both required**
 * *(R5)* — email is the automated rail and the permanent address of the order
 * token; phone is delivery, alteration, and his own hand.
 *
 * The channel radio is a real choice with a real consequence, and the note
 * beneath it says the consequence out loud rather than letting it be discovered
 * *(R11)*: **the email fires either way.** What WhatsApp changes is that the
 * hand-sent draft becomes a required row in his queue.
 */
export function OrderContactFields({
	locale,
	copy,
}: {
	locale: Locale;
	copy: Content["order"]["form"];
}) {
	return (
		<>
			{/* The locale the form was read in, carried rather than inferred. It
			    becomes `orders.locale`, which every email is then selected by. */}
			<input type="hidden" name="locale" value={locale} />

			<h3>{copy.detailsHeading}</h3>

			<p>
				<label htmlFor="name">{copy.name}</label>
				<input id="name" name="name" type="text" autoComplete="name" required />
			</p>

			<p>
				<label htmlFor="email">{copy.email}</label>
				<input id="email" name="email" type="email" autoComplete="email" required />
				<span id="email-hint">{copy.emailHint}</span>
			</p>

			<p>
				<label htmlFor="phone">{copy.phone}</label>
				<input id="phone" name="phone" type="tel" autoComplete="tel" required />
				<span id="phone-hint">{copy.phoneHint}</span>
			</p>

			<fieldset>
				<legend>{copy.channelHeading}</legend>
				<p>
					<input
						id="channel-email"
						name="preferredChannel"
						type="radio"
						value="email"
						defaultChecked
					/>
					<label htmlFor="channel-email">{copy.channelEmail}</label>
				</p>
				<p>
					<input id="channel-whatsapp" name="preferredChannel" type="radio" value="whatsapp" />
					<label htmlFor="channel-whatsapp">{copy.channelWhatsapp}</label>
				</p>
				{/* The email fires either way, and this is where that is said. */}
				<p>{copy.channelNote}</p>
			</fieldset>

			<Honeypot />
		</>
	);
}

/**
 * A field for nobody.
 *
 * There is no captcha here and there will not be: `CLAUDE.md` forbids a paid
 * service, and the free ones are a third party watching the form where someone
 * types their phone number. This is the cheap half of the answer — it stops the
 * undirected scripted submission and nothing more, and the write path in
 * `src/lib/order-create.ts` validates on its own rather than relying on it.
 *
 * Named `hp` rather than something plausible, so a password manager has nothing
 * to recognise and no reason to fill it. Hidden from the tab order and from
 * assistive technology, so no real person is ever offered it.
 */
function Honeypot() {
	return (
		<div aria-hidden="true" style={{ position: "absolute", left: "-9999px" }}>
			<label htmlFor="hp">Leave this empty</label>
			<input id="hp" name="hp" type="text" tabIndex={-1} autoComplete="off" />
		</div>
	);
}
