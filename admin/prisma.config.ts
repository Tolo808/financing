import "dotenv/config";
import { defineConfig, env } from "@prisma/config";

// Prisma CLI operations (migrate/introspect) need a direct (non-pooled) connection.
// The app's runtime queries go through the PrismaPg adapter in src/server/db.ts, which
// reads DATABASE_URL independently — that's where Supabase's pooled connection string
// belongs, so the split is: DIRECT_URL here, DATABASE_URL for the running app.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DIRECT_URL"),
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
