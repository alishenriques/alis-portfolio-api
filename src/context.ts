import type { YogaInitialContext } from "graphql-yoga";
import type { Database } from "./db/client.js";
import type { CloudinaryClient } from "./lib/cloudinary.js";
import type { Env } from "./schemas/domain.js";

export type AppContext = {
  env: Env;
  db: Database | null;
  cloudinary: CloudinaryClient | null;
  isCmsAuthorized: boolean;
};

export function createContext(
  env: Env,
  db: Database | null,
  cloudinary: CloudinaryClient | null,
) {
  return function context(initial: YogaInitialContext): AppContext {
    const header = initial.request.headers.get("x-cms-key");
    return {
      env,
      db,
      cloudinary,
      isCmsAuthorized: Boolean(env.CMS_API_KEY && header === env.CMS_API_KEY),
    };
  };
}
