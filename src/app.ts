import { createYoga } from "graphql-yoga";
import { createContext } from "./context.js";
import { createDatabase } from "./db/client.js";
import { schema } from "./graphql/schema.js";
import { createCloudinary } from "./lib/cloudinary.js";
import { loadEnv, type Env } from "./schemas/domain.js";

export function createApp(env: Env = loadEnv()) {
  const db = createDatabase(env);
  const cloudinary = createCloudinary(env);

  return createYoga({
    schema,
    graphqlEndpoint: "/graphql",
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: false,
      allowedHeaders: ["Content-Type", "x-cms-key"],
    },
    context: createContext(env, db, cloudinary),
  });
}
