import { GraphQLError } from "graphql";
import { createSchema } from "graphql-yoga";
import { eq } from "drizzle-orm";
import type { AppContext } from "../context.js";
import { profiles, projects } from "../db/schema.js";
import { fallbackProfile, fallbackProjects } from "../db/fallback.js";
import { profileSchema, projectSchema, updateProfileInputSchema } from "../schemas/domain.js";

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

  type Query {
    health: String!
    profile: Profile!
    projects: [Project!]!
    project(slug: String!): Project
  }

  input UpdateProfileInput {
    name: String!
    headline: String!
    bio: String!
    avatarUrl: String
  }

  type Mutation {
    updateProfile(input: UpdateProfileInput!): Profile!
  }
`;

export const schema = createSchema({
  typeDefs,
  resolvers: {
    Query: {
      health: () => "ok",
      profile: async (_: unknown, __: unknown, context: AppContext) => {
        if (!context.db) {
          return profileSchema.parse(fallbackProfile);
        }

        const [row] = await context.db.select().from(profiles).limit(1);
        if (!row) {
          return profileSchema.parse(fallbackProfile);
        }

        return profileSchema.parse({
          id: row.id,
          name: row.name,
          headline: row.headline,
          bio: row.bio,
          avatarUrl: row.avatarUrl,
        });
      },
      projects: async (_: unknown, __: unknown, context: AppContext) => {
        if (!context.db) {
          return fallbackProjects.map((project) => projectSchema.parse(project));
        }

        const rows = await context.db.select().from(projects);
        return rows.map((row) =>
          projectSchema.parse({
            id: row.id,
            slug: row.slug,
            title: row.title,
            summary: row.summary,
            body: row.body,
            coverUrl: row.coverUrl,
            tags: row.tags,
            featured: row.featured,
            publishedAt: row.publishedAt?.toISOString() ?? null,
          }),
        );
      },
      project: async (_: unknown, args: { slug: string }, context: AppContext) => {
        const list = context.db
          ? await context.db.select().from(projects)
          : fallbackProjects;

        const row = list.find((item) => item.slug === args.slug);
        if (!row) {
          return null;
        }

        return projectSchema.parse({
          ...row,
          coverUrl: row.coverUrl,
          publishedAt:
            row.publishedAt instanceof Date
              ? row.publishedAt.toISOString()
              : (row.publishedAt ?? null),
        });
      },
    },
    Mutation: {
      updateProfile: async (
        _: unknown,
        args: { input: unknown },
        context: AppContext,
      ) => {
        if (!context.isCmsAuthorized) {
          throw new GraphQLError("Unauthorized CMS mutation", {
            extensions: { code: "UNAUTHORIZED" },
          });
        }

        const input = updateProfileInputSchema.parse(args.input);

        if (!context.db) {
          return profileSchema.parse({ ...fallbackProfile, ...input });
        }

        const [existing] = await context.db.select().from(profiles).limit(1);
        const id = existing?.id ?? "profile_1";

        await context.db
          .insert(profiles)
          .values({
            id,
            name: input.name,
            headline: input.headline,
            bio: input.bio,
            avatarUrl: input.avatarUrl ?? null,
          })
          .onConflictDoUpdate({
            target: profiles.id,
            set: {
              name: input.name,
              headline: input.headline,
              bio: input.bio,
              avatarUrl: input.avatarUrl ?? null,
            },
          });

        const [row] = await context.db.select().from(profiles).where(eq(profiles.id, id));
        return profileSchema.parse({
          id: row.id,
          name: row.name,
          headline: row.headline,
          bio: row.bio,
          avatarUrl: row.avatarUrl,
        });
      },
    },
  },
});
