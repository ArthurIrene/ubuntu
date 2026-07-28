import type { EmailTranslation } from "./en";

// Kinyarwanda for the nine emails, the re-send and their variants.
//
// **Every value is null, and that is the finished state of this file for now**
// *(R16)*. The keys are the reservation — they are cheap and they are correct —
// and the absent values are the deliberately unbuilt part. A missing
// translation falls back to English silently, so nothing is ever blocked on
// one, and R14's flip bar is three named things checked by hand rather than a
// meter counting these.
//
// Written out key by key rather than generated. The type requires every key, so
// an email added to `en.ts` breaks this build until it is named here too — a
// generated object would satisfy the compiler by casting and lose the one
// guarantee this file exists to give.

const none = { subject: null, paragraphs: null, action: null };

export const rw: EmailTranslation = {
	order_created: none,
	confirmed: none,
	confirmed_commission: none,
	declined: none,
	design_shared: none,
	design_agreed: none,
	payment_received: none,
	payment_received_design_fee: none,
	payment_received_cutting: none,
	payment_received_balance: none,
	in_the_making: none,
	on_its_way: none,
	delivered: none,
	token_resend: none,
};
