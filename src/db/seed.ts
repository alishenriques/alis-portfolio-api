import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { profiles, projects } from "./schema.js";
import * as schema from "./schema.js";
import { loadEnv } from "../schemas/domain.js";

/**
 * Placeholder content so the portfolio has something to render.
 * Edit the values below (or use the CMS mutations) and re-run: it is idempotent.
 */
const profile = {
  id: "profile_main",
  name: "Alisson Henriques",
  headline: "Front-end engineer",
  bio: "Placeholder bio. Replace me with your real story.",
  avatarUrl: null,
};

const sampleProject = {
  slug: "sample-project",
  title: "Sample project",
  summary: "A placeholder project seeded into the CMS.",
  body: "Replace this record with a real project using the upsertProject mutation.",
  coverUrl: null,
  tags: ["react", "typescript", "graphql"],
  featured: true,
  publishedAt: new Date(),
  sortOrder: 0,
};

const { DATABASE_URL } = loadEnv();
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required to seed the database");
}

const db = drizzle(neon(DATABASE_URL), { schema });

await db
  .insert(profiles)
  .values(profile)
  .onConflictDoUpdate({ target: profiles.id, set: { ...profile, updatedAt: new Date() } });

await db
  .insert(projects)
  .values({ id: "project_sample", ...sampleProject })
  .onConflictDoUpdate({ target: projects.slug, set: sampleProject });

console.log("Seed applied: 1 profile, 1 project");
