import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	images: {
		// **The default loader does not work here** and never will: it asks the
		// hosting platform to resize on demand, and this one allows 10ms of CPU per
		// request and cannot run `sharp` at all. The derivatives are made in the
		// browser at upload time; the loader maps a requested width to the nearest
		// one that exists *(R8)*.
		loader: "custom",
		loaderFile: "./src/lib/image-loader.ts",

		// The only three widths that exist. Left at Next's defaults, every `srcset`
		// would list eight candidate widths that all resolve to the same 400px
		// file — a browser choosing between duplicate URLs, and bytes spent
		// describing them on a connection where bytes are the whole constraint.
		deviceSizes: [400, 800, 1600],
		imageSizes: [400],
	},
};

export default nextConfig;

// Enable calling `getCloudflareContext()` in `next dev`.
// See https://opennext.js.org/cloudflare/bindings#local-access-to-bindings.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
