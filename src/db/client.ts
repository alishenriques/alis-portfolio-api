import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import type { Env } from "../schemas/domain.js";
import * as schema from "./schema.js";

export type Database = ReturnType<typeof createDatabase>;

export function createDatabase(env: Env) {
  if (!env.DATABASE_URL) {
    return null;
  }

  const sql = neon(env.DATABASE_URL);
  return drizzle(sql, { schema });
}
