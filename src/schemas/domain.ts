import { z } from "zod";

export const envSchema = z.object({
  DATABASE_URL: z.string().optional(),
  CMS_API_KEY: z.string().min(8).optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return envSchema.parse(source);
}

export const profileSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  headline: z.string().min(1),
  bio: z.string().min(1),
  avatarUrl: z.string().url().nullable(),
});

export const projectSchema = z.object({
  id: z.string(),
  slug: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  body: z.string(),
  coverUrl: z.string().url().nullable(),
  tags: z.array(z.string()),
  featured: z.boolean(),
  publishedAt: z.string().nullable(),
});

export const updateProfileInputSchema = z.object({
  name: z.string().min(1),
  headline: z.string().min(1),
  bio: z.string().min(1),
  avatarUrl: z.string().url().nullable().optional(),
});

export type Profile = z.infer<typeof profileSchema>;
export type Project = z.infer<typeof projectSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;
