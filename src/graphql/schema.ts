import { randomUUID } from "node:crypto";
import { GraphQLError } from "graphql";
import { createSchema } from "graphql-yoga";
import { and, asc, desc, eq, isNotNull, lte } from "drizzle-orm";
import { ZodError, type ZodType } from "zod";
import type { AppContext } from "../context.js";
import type { Database } from "../db/client.js";
import { fallbackExperiences, fallbackProfile, fallbackProjects } from "../db/fallback.js";
import { experiences, profiles, projects } from "../db/schema.js";
import { signUpload } from "../lib/cloudinary.js";
import {
  experienceSchema,
  profileSchema,
  projectSchema,
  slugSchema,
  updateProfileInputSchema,
  upsertExperienceInputSchema,
  upsertProjectInputSchema,
} from "../schemas/domain.js";

const PROFILE_ID = "profile_main";

export const typeDefs = /* GraphQL */ `
  type Profile {
    id: ID!
    name: String!
    headline: String!
    bio: String!
    avatarUrl: String
  }

  type Project {
    id: ID!
    slug: String!
    title: String!
    summary: String!
    body: String!
    coverUrl: String
    tags: [String!]!
    featured: Boolean!
    publishedAt: String
  }

  type Experience {
    id: ID!
    company: String!
    companyLogoUrl: String
    role: String!
    "YYYY-MM"
    startDate: String!
    "YYYY-MM. Null means the role is current."
    endDate: String
    description: String!
    sortOrder: Int!
  }

  type UploadSignature {
    cloudName: String!
    apiKey: String!
    timestamp: Int!
    folder: String!
    signature: String!
  }

  type Query {
    health: String!
    profile: Profile!
    "Published projects. With a valid x-cms-key, drafts are included."
    projects: [Project!]!
    project(slug: String!): Project
    "Ordered by sortOrder, then most recent startDate first."
    experiences: [Experience!]!
  }

  input UpdateProfileInput {
    name: String!
    headline: String!
    bio: String!
    avatarUrl: String
  }

  input UpsertProjectInput {
    slug: String!
    title: String!
    summary: String!
    body: String
    coverUrl: String
    tags: [String!]
    featured: Boolean
    "ISO 8601. Null or omitted keeps the project as a draft."
    publishedAt: String
    sortOrder: Int
  }

  input UpsertExperienceInput {
    "Omit to create a new experience; pass an existing id to edit it."
    id: ID
    company: String!
    companyLogoUrl: String
    role: String!
    startDate: String!
    endDate: String
    description: String!
    sortOrder: Int
  }

  type Mutation {
    updateProfile(input: UpdateProfileInput!): Profile!
    "Creates or fully replaces the project with the given slug."
    upsertProject(input: UpsertProjectInput!): Project!
    deleteProject(slug: String!): Boolean!
    "Creates a new experience, or updates one when input.id is given."
    upsertExperience(input: UpsertExperienceInput!): Experience!
    deleteExperience(id: ID!): Boolean!
    "Signed parameters for a direct browser upload to Cloudinary."
    createUploadSignature: UploadSignature!
  }
`;

function fail(message: string, code: string): never {
  throw new GraphQLError(message, { extensions: { code } });
}

function requireCms(context: AppContext) {
  if (!context.isCmsAuthorized) {
    fail("Unauthorized CMS mutation", "UNAUTHORIZED");
  }
}

function requireDb(context: AppContext): Database {
  if (!context.db) {
    fail("Database is not configured", "DATABASE_UNAVAILABLE");
  }
  return context.db;
}

function parseInput<T>(schema: ZodType<T>, value: unknown): T {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      fail(
        error.issues.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`).join("; "),
        "BAD_USER_INPUT",
      );
    }
    throw error;
  }
}

type ProfileRow = typeof profiles.$inferSelect;
type ProjectRow = typeof projects.$inferSelect;
type ExperienceRow = typeof experiences.$inferSelect;

function toProfile(row: ProfileRow) {
  return profileSchema.parse({
    id: row.id,
    name: row.name,
    headline: row.headline,
    bio: row.bio,
    avatarUrl: row.avatarUrl,
  });
}

function toProject(row: ProjectRow) {
  return projectSchema.parse({
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    body: row.body,
    coverUrl: row.coverUrl,
    tags: row.tags,
    featured: row.featured,
    publishedAt: row.publishedAt?.toISOString() ?? null,
  });
}

function toExperience(row: ExperienceRow) {
  return experienceSchema.parse({
    id: row.id,
    company: row.company,
    companyLogoUrl: row.companyLogoUrl,
    role: row.role,
    startDate: row.startDate,
    endDate: row.endDate,
    description: row.description,
    sortOrder: row.sortOrder,
  });
}

const publishedOnly = () => and(isNotNull(projects.publishedAt), lte(projects.publishedAt, new Date()));

export const schema = createSchema<AppContext>({
  typeDefs,
  resolvers: {
    Query: {
      health: () => "ok",
      profile: async (_, __, context) => {
        if (!context.db) {
          return profileSchema.parse(fallbackProfile);
        }

        const [row] = await context.db.select().from(profiles).limit(1);
        return row ? toProfile(row) : profileSchema.parse(fallbackProfile);
      },
      projects: async (_, __, context) => {
        if (!context.db) {
          return fallbackProjects.map((project) => projectSchema.parse(project));
        }

        const rows = await context.db
          .select()
          .from(projects)
          .where(context.isCmsAuthorized ? undefined : publishedOnly())
          .orderBy(asc(projects.sortOrder), desc(projects.publishedAt));
        return rows.map(toProject);
      },
      project: async (_, args: { slug: string }, context) => {
        if (!context.db) {
          const found = fallbackProjects.find((item) => item.slug === args.slug);
          return found ? projectSchema.parse(found) : null;
        }

        const conditions = [eq(projects.slug, args.slug)];
        if (!context.isCmsAuthorized) {
          conditions.push(publishedOnly()!);
        }
        const [row] = await context.db
          .select()
          .from(projects)
          .where(and(...conditions))
          .limit(1);
        return row ? toProject(row) : null;
      },
      experiences: async (_, __, context) => {
        if (!context.db) {
          return fallbackExperiences.map((experience) => experienceSchema.parse(experience));
        }

        const rows = await context.db
          .select()
          .from(experiences)
          .orderBy(asc(experiences.sortOrder), desc(experiences.startDate));
        return rows.map(toExperience);
      },
    },
    Mutation: {
      updateProfile: async (_, args: { input: unknown }, context) => {
        requireCms(context);
        const input = parseInput(updateProfileInputSchema, args.input);
        const db = requireDb(context);

        const values = {
          name: input.name,
          headline: input.headline,
          bio: input.bio,
          avatarUrl: input.avatarUrl ?? null,
          updatedAt: new Date(),
        };
        const [row] = await db
          .insert(profiles)
          .values({ id: PROFILE_ID, ...values })
          .onConflictDoUpdate({ target: profiles.id, set: values })
          .returning();
        return toProfile(row);
      },
      upsertProject: async (_, args: { input: unknown }, context) => {
        requireCms(context);
        const input = parseInput(upsertProjectInputSchema, args.input);
        const db = requireDb(context);

        const values = {
          slug: input.slug,
          title: input.title,
          summary: input.summary,
          body: input.body,
          coverUrl: input.coverUrl ?? null,
          tags: input.tags,
          featured: input.featured,
          publishedAt: input.publishedAt ? new Date(input.publishedAt) : null,
          sortOrder: input.sortOrder,
        };
        const [row] = await db
          .insert(projects)
          .values({ id: randomUUID(), ...values })
          .onConflictDoUpdate({ target: projects.slug, set: values })
          .returning();
        return toProject(row);
      },
      deleteProject: async (_, args: { slug: string }, context) => {
        requireCms(context);
        const slug = parseInput(slugSchema, args.slug);
        const db = requireDb(context);

        const deleted = await db.delete(projects).where(eq(projects.slug, slug)).returning({ id: projects.id });
        return deleted.length > 0;
      },
      upsertExperience: async (_, args: { input: unknown }, context) => {
        requireCms(context);
        const input = parseInput(upsertExperienceInputSchema, args.input);
        const db = requireDb(context);

        const values = {
          company: input.company,
          companyLogoUrl: input.companyLogoUrl ?? null,
          role: input.role,
          startDate: input.startDate,
          endDate: input.endDate ?? null,
          description: input.description,
          sortOrder: input.sortOrder,
        };
        const [row] = await db
          .insert(experiences)
          .values({ id: input.id ?? randomUUID(), ...values })
          .onConflictDoUpdate({ target: experiences.id, set: values })
          .returning();
        return toExperience(row);
      },
      deleteExperience: async (_, args: { id: string }, context) => {
        requireCms(context);
        const db = requireDb(context);

        const deleted = await db
          .delete(experiences)
          .where(eq(experiences.id, args.id))
          .returning({ id: experiences.id });
        return deleted.length > 0;
      },
      createUploadSignature: (_, __, context) => {
        requireCms(context);
        if (!context.cloudinary) {
          fail("Cloudinary is not configured", "CLOUDINARY_UNAVAILABLE");
        }
        return signUpload(context.cloudinary, context.env);
      },
    },
  },
});
