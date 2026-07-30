import { describe, expect, it } from "vitest";
import imageLoader, { DERIVATIVES, derivativeKey, nearestDerivative } from "./image-loader";

describe("nearestDerivative", () => {
	it("rounds up to the smallest derivative at least as wide as the request", () => {
		// A photograph shown slightly larger than its pixels is the one visible
		// failure mode on a garment site, and the bytes between two adjacent
		// derivatives are far cheaper than the difference between a sharp piece and
		// a soft one.
		expect(nearestDerivative(1)).toBe(400);
		expect(nearestDerivative(400)).toBe(400);
		expect(nearestDerivative(401)).toBe(800);
		expect(nearestDerivative(1600)).toBe(1600);
	});

	it("gives the largest we have when the request is bigger than anything stored", () => {
		// Nothing above 1600px is ever uploaded — his phone is the archive.
		expect(nearestDerivative(4000)).toBe(1600);
	});
});

describe("imageLoader", () => {
	const base = "https://example.supabase.co/storage/v1/object/public/ubuntu-public/abc123";

	it("appends the derivative to the base URL it is given", () => {
		expect(imageLoader({ src: base, width: 700 })).toBe(`${base}/800.webp`);
	});

	it("maps every width a srcset can ask for onto a file that exists", () => {
		for (const width of DERIVATIVES) {
			expect(imageLoader({ src: base, width })).toBe(`${base}/${width}.webp`);
		}
	});

	it("is the same suffix the upload path stores under", () => {
		// The public URL is the object key under a bucket prefix and nothing else,
		// so one function serves both — a derivative that is written and a
		// derivative that is read cannot drift apart.
		expect(imageLoader({ src: base, width: 800 })).toBe(derivativeKey(base, 800));
	});

	it("reaches for nothing", async () => {
		// next/image is a client component, so Next bundles this loader into the
		// browser and runs it again on hydration. A loader that imported the storage
		// adapter would be reaching for getCloudflareContext() and the service-role
		// key in a browser.
		const source = await import("node:fs").then((fs) =>
			fs.readFileSync("src/lib/image-loader.ts", "utf8"),
		);
		expect(source).not.toMatch(/^import /m);
	});
});
