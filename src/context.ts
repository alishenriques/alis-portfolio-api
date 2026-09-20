import type { YogaInitialContext } from "graphql-yoga";
import type { Database } from "./db/client.js";
import type { Env } from "./schemas/domain.js";
import type { v2 as Cloudinary } from "cloudinary";

export type AppContext = {
  env: Env;
  db: Database | null;
  cloudinary: typeof Cloudinary | null;
  isCmsAuthorized: boolean;
};

export function createContext(
  env: Env,
  db: Database | null,
  cloudinary: typeof Cloudinary | null,
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
