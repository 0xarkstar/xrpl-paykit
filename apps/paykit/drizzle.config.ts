import type { Config } from "drizzle-kit";

const url = (process.env.PAYKIT_DATABASE_URL ?? "file:./paykit.db").replace(/^file:/, "");

export default {
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "sqlite",
  dbCredentials: { url },
} satisfies Config;
