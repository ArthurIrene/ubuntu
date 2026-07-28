"use server";

import { redirect } from "next/navigation";

import { auth, requireSession } from "@/lib/auth";

/**
 * Redeem a re-auth link.
 *
 * The session gate runs first: this is a step **up** from an existing session,
 * not a way into one. A browser holding only this cookie is not signed in, and
 * `current()` reads a different one.
 */
export async function redeemLinkAction(form: FormData): Promise<void> {
	await requireSession();

	const token = String(form.get("t") ?? "");
	const redeemed = await auth.redeemReauth(token);

	redirect(redeemed.ok ? "/dashboard/settings" : "/dashboard/settings?e=stale");
}
