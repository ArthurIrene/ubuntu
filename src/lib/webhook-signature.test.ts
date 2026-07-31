import { describe, expect, it } from "vitest";

import { TIMESTAMP_TOLERANCE_SECONDS, verifyWebhook } from "./webhook-signature";

// The bounce webhook writes to the Today queue *(R11)*, so what it accepts is a
// security boundary and not an integration detail. These tests are the
// simulated-bounce half of Phase 4's proof: real delivery is Phase 7, and every
// line of the verifier is exercised here without it.

const SECRET_BYTES = new Uint8Array([
	0x9a, 0x4f, 0x2c, 0x11, 0x7e, 0x63, 0xd8, 0x05, 0x3b, 0xa1, 0xcf, 0x47, 0x20, 0x8e, 0x96, 0x52,
	0x0d, 0x71, 0xb4, 0xe8, 0x33, 0x5c, 0xa9, 0x1f, 0x68, 0x02, 0xdd, 0x7a, 0x45, 0xb0, 0xe3, 0x19,
]);

const SECRET = `whsec_${btoa(String.fromCharCode(...SECRET_BYTES))}`;

const NOW = 1_780_000_000;
const ID = "msg_2abcDEF";
const BODY = JSON.stringify({
	type: "email.bounced",
	data: { tags: [{ name: "reference", value: "0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0_confirmed" }] },
});

/** The signature the provider would have sent, computed the same way it does. */
async function sign(body: string, id: string, timestamp: number): Promise<string> {
	const key = await crypto.subtle.importKey(
		"raw",
		SECRET_BYTES,
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const mac = await crypto.subtle.sign(
		"HMAC",
		key,
		new TextEncoder().encode(`${id}.${timestamp}.${body}`),
	);
	return `v1,${btoa(String.fromCharCode(...new Uint8Array(mac)))}`;
}

const verify = (overrides: Partial<Parameters<typeof verifyWebhook>[0]> = {}) =>
	verifyWebhook({ body: BODY, secret: SECRET, nowSeconds: NOW, ...overrides } as Parameters<
		typeof verifyWebhook
	>[0]);

describe("verifyWebhook", () => {
	it("accepts a genuinely signed request", async () => {
		const signature = await sign(BODY, ID, NOW);
		expect(
			await verify({ headers: { id: ID, timestamp: String(NOW), signature } }),
		).toBe(true);
	});

	it("refuses a body that changed after it was signed", async () => {
		// The whole point: the signature covers the exact bytes, so a tampered
		// reference cannot file a bounce against somebody else's order.
		const signature = await sign(BODY, ID, NOW);
		const tampered = BODY.replace("confirmed", "declined");
		expect(
			await verify({ body: tampered, headers: { id: ID, timestamp: String(NOW), signature } }),
		).toBe(false);
	});

	it("refuses a signature made with a different key", async () => {
		const signature = await sign(BODY, ID, NOW);
		const other = `whsec_${btoa(String.fromCharCode(...SECRET_BYTES.map((b) => b ^ 0xff)))}`;
		expect(
			await verify({ secret: other, headers: { id: ID, timestamp: String(NOW), signature } }),
		).toBe(false);
	});

	it("refuses a replay from outside the tolerance window", async () => {
		// A valid signature is valid forever without this. Anyone who has ever
		// seen one request could otherwise resend it whenever they liked.
		const old = NOW - TIMESTAMP_TOLERANCE_SECONDS - 1;
		const signature = await sign(BODY, ID, old);
		expect(
			await verify({ headers: { id: ID, timestamp: String(old), signature } }),
		).toBe(false);
	});

	it("accepts one at the edge of the window", async () => {
		const edge = NOW - TIMESTAMP_TOLERANCE_SECONDS;
		const signature = await sign(BODY, ID, edge);
		expect(
			await verify({ headers: { id: ID, timestamp: String(edge), signature } }),
		).toBe(true);
	});

	it("refuses a signature bound to a different message id", async () => {
		const signature = await sign(BODY, "msg_somethingElse", NOW);
		expect(
			await verify({ headers: { id: ID, timestamp: String(NOW), signature } }),
		).toBe(false);
	});

	it("fails closed on a missing header", async () => {
		const signature = await sign(BODY, ID, NOW);
		expect(await verify({ headers: { id: null, timestamp: String(NOW), signature } })).toBe(false);
		expect(await verify({ headers: { id: ID, timestamp: null, signature } })).toBe(false);
		expect(await verify({ headers: { id: ID, timestamp: String(NOW), signature: null } })).toBe(
			false,
		);
	});

	it("fails closed on a malformed secret", async () => {
		const signature = await sign(BODY, ID, NOW);
		// No prefix, and a prefix with something that is not base64 behind it.
		expect(
			await verify({ secret: "nope", headers: { id: ID, timestamp: String(NOW), signature } }),
		).toBe(false);
		expect(
			await verify({
				secret: "whsec_!!!not-base64!!!",
				headers: { id: ID, timestamp: String(NOW), signature },
			}),
		).toBe(false);
	});

	it("fails closed on an unparseable timestamp", async () => {
		const signature = await sign(BODY, ID, NOW);
		expect(
			await verify({ headers: { id: ID, timestamp: "yesterday", signature } }),
		).toBe(false);
	});

	it("accepts when one of several offered signatures matches", async () => {
		// Several are sent during a secret rotation, so that there is no window
		// where neither key works.
		const good = await sign(BODY, ID, NOW);
		expect(
			await verify({ headers: { id: ID, timestamp: String(NOW), signature: `v1,AAAA ${good}` } }),
		).toBe(true);
	});

	it("ignores a version it does not know", async () => {
		const good = await sign(BODY, ID, NOW);
		const wrongVersion = good.replace("v1,", "v2,");
		expect(
			await verify({ headers: { id: ID, timestamp: String(NOW), signature: wrongVersion } }),
		).toBe(false);
	});
});
