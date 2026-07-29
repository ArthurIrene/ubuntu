"use server";

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { email as mailer, EmailNotConfiguredError } from "@/lib/email";
import { signInEmail } from "@/emails/sign-in";

/**
 * Step one: ask for the link.
 *
 * **The answer is the same whatever happened.** A wrong address, a provider
 * outage at Supabase and a link genuinely on its way all land on the same
 * screen, because this form is otherwise a way to discover which address the
 * one account uses. The exception is a missing key, which is not a secret and
 * is a deployment problem he needs told in plain words.
 */
export async function requestLink(formData: FormData): Promise<void> {
	const address = String(formData.get("email") ?? "");

	const link = await auth.beginLogin(address);

	if (link.ok) {
		try {
			await mailer.send(signInEmail(link.value.to, link.value.url));
		} catch (error) {
			if (error instanceof EmailNotConfiguredError) redirect("/dashboard/login?e=unconfigured");
			redirect("/dashboard/login?e=undelivered");
		}
	} else if (link.reason === "unconfigured") {
		redirect("/dashboard/login?e=unconfigured");
	} else {
		// The screen says *a link is on its way* whatever happened, deliberately.
		// That is also what makes a genuine fault here invisible from the browser:
		// a wrong address and Supabase refusing `generate_link` both look exactly
		// like a link that was sent. One line in the log, with the reason and not
		// the address, is the difference between debugging this and guessing.
		console.error(`login: no link minted (${link.reason}) — nothing was sent`);
	}

	redirect("/dashboard/login?sent=1");
}

/**
 * Step two: the link and the password, together.
 *
 * Both are verified before anything is minted, and either failing gives the
 * same sentence — the screen cannot be used to learn which half was right.
 */
export async function completeLogin(formData: FormData): Promise<void> {
	const token = String(formData.get("t") ?? "");
	const password = String(formData.get("password") ?? "");

	const session = await auth.completeLogin(token, password);
	if (!session.ok) redirect("/dashboard/login?e=rejected");

	redirect("/dashboard");
}

/**
 * The development escape hatch: password, no link.
 *
 * **Not a second way in on the deployed site.** `auth.signInWithPassword`
 * refuses unless `DEV_PASSWORD_LOGIN=open` *and* the request arrived over
 * plain http, so this action is inert in production however it is called. The
 * form that posts to it does not render there either.
 *
 * It exists because the mail rail is the thing that breaks: on Resend's free
 * tier, before a verified domain, the only address that receives anything is
 * the account holder's own. Locking local development behind that is locking
 * it behind someone else's DNS.
 */
export async function signInWithPassword(formData: FormData): Promise<void> {
	const address = String(formData.get("email") ?? "");
	const password = String(formData.get("password") ?? "");

	const session = await auth.signInWithPassword(address, password);
	if (!session.ok) redirect("/dashboard/login?e=rejected");

	redirect("/dashboard");
}

/** This browser only. His other devices keep their sessions. */
export async function signOut(): Promise<void> {
	await auth.signOut();
	redirect("/dashboard/login");
}

/**
 * Everywhere, immediately — the kill switch *(R12c)*.
 *
 * Advances `sessions_valid_after`, which kills every session issued before now,
 * including this one. It is the first line of the incident plan and the only
 * one that works against a device we cannot reach.
 */
export async function signOutEverywhere(): Promise<void> {
	await auth.revoke();
	redirect("/dashboard/login?out=all");
}
