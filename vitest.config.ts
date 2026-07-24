import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Mirror the "@/*" -> "src/*" alias from tsconfig so tests resolve the same
// imports the app does. vitest ships with Vite; this adds no dependency.
export default defineConfig({
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
});
