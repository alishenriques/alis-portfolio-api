import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { createApp } from "../app.js";
import type { Database } from "../db/client.js";
import * as schema from "../db/schema.js";
import { createCloudinary } from "../lib/cloudinary.js";
import { loadEnv } from "../schemas/domain.js";

export const CMS_KEY = "test-cms-key-123";

export const testEnv = loadEnv({
  NODE_ENV: "test",
  CMS_API_KEY: CMS_KEY,
  CLOUDINARY_CLOUD_NAME: "demo-cloud",
  CLOUDINARY_API_KEY: "123456789012345",
  CLOUDINARY_API_SECRET: "test-secret",
});

let sharedDb: Promise<Database> | undefined;

/** One migrated in-memory Postgres per test file; tables are emptied on every call. */
export async function createTestDatabase(): Promise<Database> {
  sharedDb ??= (async () => {
    const db = drizzle(new PGlite(), { schema });
    await migrate(db, { migrationsFolder: "./drizzle" });
    return db;
  })();

  const db = await sharedDb;
  await db.execute(sql`truncate table media, profiles, projects`);
  return db;
}

export async function createTestApp(options: { db?: Database | null; cms?: boolean } = {}) {
  const db = options.db === undefined ? await createTestDatabase() : options.db;
  const app = createApp(testEnv, { db, cloudinary: createCloudinary(testEnv) });

  async function gql<T = Record<string, unknown>>(
    query: string,
    { cms = options.cms ?? false, key }: { cms?: boolean; key?: string } = {},
  ) {
    const cmsKey = key ?? (cms ? CMS_KEY : undefined);
    const response = await app.fetch("http://localhost/graphql", {
      method: "POST",
      headers: { "content-type": "application/json", ...(cmsKey ? { "x-cms-key": cmsKey } : {}) },
      body: JSON.stringify({ query }),
    });
    return (await response.json()) as { data: T | null; errors?: { message: string; extensions?: { code?: string } }[] };
  }

  return { gql, db };
}
