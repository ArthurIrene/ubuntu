import { describe, expect, it } from "vitest";

import { en } from "./en";
import { formatDays, orderEmail, whatsappDraft } from "./order";

const LINK = "https://ubuntu.rw/o/aBcD1234aBcD1234aBcD12";

const vars = {
	name: "Claudine",
	piece: "Fishing shorts",
	amount: { value: 51_000, currency: "RWF" },
	days: 3,
	link: LINK,
};

describe("the nine, and the two variants of each that needed one", () => {
	it("names every key in both locales", () => {
		// The keys are the reservation; the absent Kinyarwanda is the unbuilt part.
		expect(Object.keys(en)).toHaveLength(14);
	});

	it("falls back to English silently where Kinyarwanda is unwritten", () => {
		const english = orderEmail("confirmed", "en", "c@example.com", vars);
		const kinyarwanda = orderEmail("confirmed", "rw", "c@example.com", vars);
		expect(kinyarwanda.subject).toBe(english.subject);
		expect(kinyarwanda.html).toBe(english.html);
	});

	it("fills the name, the piece and the money", () => {
		const message = orderEmail("confirmed", "en", "c@example.com", vars);
		expect(message.text).toContain("Claudine");
		expect(message.text).toContain("Fishing shorts");
		expect(message.text).toMatch(/51,?000/);
		expect(message.text).toContain(LINK);
	});
});

describe("the personal note", () => {
	const withNote = { ...vars, note: "I have wanted to stitch this scene for a year." };

	it("appears on the four that carry one", () => {
		for (const key of ["confirmed", "declined", "design_shared", "on_its_way"] as const) {
			const message = orderEmail(key, "en", "c@example.com", withNote);
			expect(message.text, key).toContain("I have wanted to stitch this scene");
		}
	});

	it("is ignored on the ones that do not", () => {
		for (const key of ["order_created", "delivered", "in_the_making", "token_resend"] as const) {
			const message = orderEmail(key, "en", "c@example.com", withNote);
			expect(message.text, key).not.toContain("I have wanted to stitch this scene");
		}
	});

	it("leaves the layout whole when it is empty", () => {
		const without = orderEmail("confirmed", "en", "c@example.com", { ...vars, note: "" });
		const missing = orderEmail("confirmed", "en", "c@example.com", vars);
		expect(without.html).toBe(missing.html);
		// No stray empty block where the note would have been.
		expect(without.html).not.toContain("border-left");
	});
});

describe("[X] stays visible", () => {
	it("renders the bracket when the reply time is unanswered", () => {
		expect(formatDays(null)).toBe("[X]");
		expect(formatDays(undefined)).toBe("[X]");
		expect(formatDays(3)).toBe("3");
	});

	it("never invents a number in a body", () => {
		const message = orderEmail("order_created", "en", "c@example.com", { ...vars, days: null });
		expect(message.text).toContain("within [X] days");
	});
});

describe("the WhatsApp draft", () => {
	it("says the same words as the email and carries the same link", () => {
		const message = orderEmail("confirmed", "en", "c@example.com", vars);
		const draft = whatsappDraft("confirmed", "en", "+250 788 000 111", vars);
		const text = decodeURIComponent(draft.split("?text=")[1]);

		for (const line of en.confirmed.paragraphs) {
			// Compare on the fixed half of each sentence, past the placeholders.
			const fixed = line.split("{")[0].trim();
			if (fixed.length > 12) expect(text).toContain(fixed);
		}
		expect(text).toContain(LINK);
		expect(message.text).toContain(LINK);
	});

	it("strips the phone number to digits, as wa.me wants", () => {
		expect(whatsappDraft("delivered", "en", "+250 788-000 111", vars)).toContain(
			"https://wa.me/250788000111?text=",
		);
	});

	it("carries no measurement, because nothing in the shape can reach one", () => {
		// The closed variable set is the mechanism, not a rule someone remembers.
		const draft = whatsappDraft("in_the_making", "en", "250788000111", vars);
		expect(decodeURIComponent(draft)).not.toMatch(/\b(chest|waist|hip|inseam|\d+\s?cm)\b/i);
	});
});

describe("the money a customer reads", () => {
	it("has no fractional francs", () => {
		const message = orderEmail("payment_received", "en", "c@example.com", vars);
		expect(message.text).not.toMatch(/51,?000\.00/);
	});
});
