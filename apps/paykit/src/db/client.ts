// PRD v0.2 §11 — better-sqlite3 + drizzle client.

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { env } from "../config";

const dbFile = env.PAYKIT_DATABASE_URL.replace(/^file:/, "");
const sqlite = new Database(dbFile);
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });
export { schema };
