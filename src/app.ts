import { createYoga } from "graphql-yoga";
import type { Resend } from "resend";
import { createContext } from "./context.js";
import { createDatabase, type Database } from "./db/client.js";
import { schema } from "./graphql/schema.js";
import { createCloudinary, type CloudinaryClient } from "./lib/cloudinary.js";
import { createResend } from "./lib/resend.js";
import { loadEnv, type Env } from "./schemas/domain.js";

export type AppDependencies = {
  db?: Database | null;
  cloudinary?: CloudinaryClient | null;
  resend?: Resend | null;
};

export function createApp(env: Env = loadEnv(), deps: AppDependencies = {}) {
  const db = deps.db !== undefined ? deps.db : createDatabase(env);
  const cloudinary = deps.cloudinary !== undefined ? deps.cloudinary : createCloudinary(env);
  const resend = deps.resend !== undefined ? deps.resend : createResend(env);

  return createYoga({
    schema,
    graphqlEndpoint: "/graphql",
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: false,
      allowedHeaders: ["Content-Type", "x-cms-key"],
    },
    context: createContext(env, db, cloudinary, resend),
  });
}
