"use client";

// The image pipeline, and it runs in the browser.
//
// **Resize, compress and encode before upload** *(R8)*. Server-side is
// impossible on this stack — 10ms of CPU per request, `sharp` absent from the
// Workers runtime, and the WASM codecs that would work counting against the
// same 3 MiB the whole app must fit inside.
//
// **The decisive argument is his uplink, not the visitor's.** He uploads from a
// phone in Kigali on metered data; browser-side turns 12 MB into about 300 KB,
// and twenty progress photos into 6 MB instead of 240 MB. No paid plan ever
// fixes that.
//
// Two traps §6 said to spike rather than discover, both handled here:
//
//  1. **EXIF orientation.** Phone photos carry a rotation flag and drawing to a
//     canvas is exactly where it is lost — the "his photos are sideways" bug,
//     which on a garment site is not cosmetic. `createImageBitmap` is asked for
//     `from-image`, which applies the flag before we ever touch pixels.
//  2. **Memory on a mid-range Android.** Decoding several 12 MB images at once
//     kills the tab. Files are processed **one at a time**, every bitmap is
//     closed, every canvas is collapsed to 0×0 after use, and progress is shown
//     so a slow phone does not look frozen.
//
// *A free side effect: re-encoding through a canvas strips all EXIF, including
// the GPS coordinates of his home and workshop.*

import { useState } from "react";

/** The three derivatives, and the one a progress photo gets *(R8)*. */
const CATALOGUE_WIDTHS = [400, 800, 1600];
const PROGRESS_WIDTHS = [1000];

type Target =
	| { kind: "piece"; pieceId: string }
	| { kind: "progress"; orderId: string };

interface Encoded {
	width: number;
	blob: Blob;
}

/**
 * WebP, or JPEG where a browser cannot encode it.
 *
 * **WebP only** was R8's decision and AVIF is closed on every free path — a
 * canvas cannot encode it anywhere. Safari's WebP encode was the open question
 * `ubuntu-technical.md` §10 sent to this spike; rather than branch on a version
 * number, we ask the canvas what it produced and believe the answer.
 */
async function encode(canvas: HTMLCanvasElement): Promise<Blob> {
	const webp = await new Promise<Blob | null>((resolve) =>
		canvas.toBlob(resolve, "image/webp", 0.82),
	);
	if (webp && webp.type === "image/webp") return webp;

	const jpeg = await new Promise<Blob | null>((resolve) =>
		canvas.toBlob(resolve, "image/jpeg", 0.85),
	);
	if (!jpeg) throw new Error("this browser could not encode the image");
	return jpeg;
}

/** One file, decoded once and drawn down to each width in turn. */
async function derivatives(file: File, widths: number[]): Promise<{
	encoded: Encoded[];
	width: number;
	height: number;
}> {
	// `from-image` is the whole EXIF fix. Without it a portrait photo taken on a
	// phone arrives sideways and nobody notices until a customer does.
	const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

	try {
		const encoded: Encoded[] = [];

		for (const target of widths) {
			// **Nothing above 1600 px is uploaded, and no original is kept** — his
			// phone is the archive. A photo smaller than a derivative is not
			// upscaled; it is stored at its own size under that name.
			const width = Math.min(target, bitmap.width);
			const height = Math.round((width / bitmap.width) * bitmap.height);

			const canvas = document.createElement("canvas");
			canvas.width = width;
			canvas.height = height;

			const context = canvas.getContext("2d");
			if (!context) throw new Error("no canvas");
			context.drawImage(bitmap, 0, 0, width, height);

			encoded.push({ width: target, blob: await encode(canvas) });

			// Collapse it rather than leaving it to the collector. On a mid-range
			// Android three of these at 1600 px is most of the tab's headroom.
			canvas.width = 0;
			canvas.height = 0;
		}

		return { encoded, width: bitmap.width, height: bitmap.height };
	} finally {
		bitmap.close();
	}
}

export default function PhotoUpload({ target, alt }: { target: Target; alt?: string }) {
	const [busy, setBusy] = useState(false);
	const [progress, setProgress] = useState<string>("");
	const [error, setError] = useState<string>("");

	async function handle(files: FileList | null) {
		if (!files || files.length === 0) return;
		setBusy(true);
		setError("");

		const widths = target.kind === "piece" ? CATALOGUE_WIDTHS : PROGRESS_WIDTHS;

		try {
			// **One at a time.** He will upload ten from the same phone that took
			// them, and decoding them in parallel is how the tab dies.
			for (let index = 0; index < files.length; index += 1) {
				setProgress(`${index + 1} of ${files.length}`);

				const { encoded, width, height } = await derivatives(files[index], widths);

				const body = new FormData();
				body.set("kind", target.kind);
				body.set("targetId", target.kind === "piece" ? target.pieceId : target.orderId);
				body.set("width", String(width));
				body.set("height", String(height));
				// **Alt text is required, defaulting to the piece's scene line**
				// *(R8)*. The server applies that default; this passes what the
				// screen already knows.
				if (alt) body.set("alt", alt);

				for (const derivative of encoded) {
					body.append(`w${derivative.width}`, derivative.blob, `${derivative.width}.webp`);
				}

				const response = await fetch("/dashboard/api/upload", { method: "POST", body });
				if (!response.ok) {
					throw new Error(`the upload was refused (${response.status})`);
				}
			}

			setProgress("");
			// A server-rendered page holds the list; the simplest correct refresh is
			// to ask for it again.
			window.location.reload();
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "that did not work");
		} finally {
			setBusy(false);
		}
	}

	return (
		<p>
			<label htmlFor={`upload-${target.kind}`}>Add photographs</label>
			<input
				id={`upload-${target.kind}`}
				type="file"
				accept="image/*"
				multiple
				disabled={busy}
				onChange={(event) => handle(event.target.files)}
			/>
			{busy && <span> Working — {progress}. Keep this page open.</span>}
			{error && <span role="alert"> {error}</span>}
		</p>
	);
}
