import { integer, pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const profiles = pgTable("profiles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  headline: text("headline").notNull(),
  bio: text("bio").notNull(),
  avatarUrl: text("avatar_url"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  body: text("body").notNull(),
  coverUrl: text("cover_url"),
  tags: text("tags").array().notNull().default([]),
  featured: boolean("featured").notNull().default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const media = pgTable("media", {
  id: text("id").primaryKey(),
  publicId: text("public_id").notNull(),
  url: text("url").notNull(),
  alt: text("alt").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
