import type { Experience, Profile, Project } from "../schemas/domain.js";

export const fallbackProfile: Profile = {
  id: "profile_local",
  name: "Alis",
  headline: "Interactive product engineer",
  bio: "Portfolio CMS is running in local fallback mode until Neon is connected.",
  avatarUrl: null,
};

export const fallbackProjects: Project[] = [
  {
    id: "project_local_1",
    slug: "signal-garden",
    title: "Signal Garden",
    summary: "Placeholder featured work while the CMS is wired to Neon and Cloudinary.",
    body: "Replace this record through GraphQL mutations after the database is live.",
    coverUrl: null,
    tags: ["react", "motion", "graphql"],
    featured: true,
    publishedAt: new Date().toISOString(),
  },
];

// No placeholder made up here: real experience data comes from the CMS.
export const fallbackExperiences: Experience[] = [];
