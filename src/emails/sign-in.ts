// The one email that is not a customer's.
//
// It carries the magic-link half of the login *(R12b)*. English only, and not
// keyed in both locales like the nine order emails are: the dashboard is one
// language because there is one reader.
//
// **The link is a credential.** It is never rendered on a screen, never
// returned to a browser, and never logged — it goes to the mailbox that is the
// root of trust and nowhere else.

import type { EmailMessage } from "@/lib/email";

import { shell } from "./shell";

export function signInEmail(to: string, link: string): EmailMessage {
	const body = shell({
		preview: "Your sign-in link for the Ubuntu dashboard.",
		paragraphs: [
			"Here is your sign-in link. It opens the dashboard and then asks for your password — both, every time.",
			"If you did not ask for this, someone has your email address and not your password. Change the password and sign out everywhere.",
		],
		action: { label: "Open the dashboard", url: link },
		signature: "Ubuntu",
	});

	return {
		// The admin row's own address, as the adapter read it — never the string
		// typed into the form. *(R12a: not the address printed on the site.)*
		to,
		subject: "Your sign-in link",
		html: body.html,
		text: body.text,
	};
}
