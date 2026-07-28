// Drizzle Kit: how migrations are generated from the schema.
//
// This file is only ever read by `pnpm db:generate`. Applying a migration goes
// through `scripts/db-migrate.mjs` instead, so that the forward-only check has
// somewhere to live and so that nothing in the deploy path can reach a
// migration by accident.

import { defineConfig } from "drizzle-kit";

export default defineConfig({
	schema: "./src/db/schema/index.ts",
	out: "./drizzle",
	dialect: "postgresql",
	casing: "snake_case",
	// `db-migrate.mjs` is what applies these, and it loads the URL itself.
	// Present here because drizzle-kit's config type wants it.
	dbCredentials: { url: process.env.DATABASE_URL ?? "" },
	strict: true,
	verbose: true,
});
