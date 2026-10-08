import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { loadEnv } from "./schemas/domain.js";

const app = createApp(loadEnv({ NODE_ENV: "test" }));

async function query(query: string, headers: Record<string, string> = {}) {
  const response = await app.fetch("http://localhost/graphql", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ query }),
  });
  return response.json();
}

describe("GraphQL app (fallback mode)", () => {
  it("answers the health query", async () => {
    expect(await query("{ health }")).toEqual({ data: { health: "ok" } });
  });

  it("serves the fallback profile without a database", async () => {
    const result = await query("{ profile { name headline } }");
    expect(result.data.profile.name).toBe("Alis");
  });
});

describe("CORS", () => {
  const corsApp = createApp(
    loadEnv({ NODE_ENV: "test", CORS_ORIGIN: "https://alissonhenriques.dev,https://alis-portfolio-three.vercel.app" }),
  );

  async function preflight(origin: string) {
    return corsApp.fetch("http://localhost/graphql", {
      method: "OPTIONS",
      headers: { origin, "access-control-request-method": "POST" },
    });
  }

  it("allows every configured origin", async () => {
    for (const origin of ["https://alissonhenriques.dev", "https://alis-portfolio-three.vercel.app"]) {
      const response = await preflight(origin);
      expect(response.headers.get("access-control-allow-origin")).toBe(origin);
    }
  });

  it("does not allow an unknown origin", async () => {
    const response = await preflight("https://evil.example");
    expect(response.headers.get("access-control-allow-origin")).not.toBe("https://evil.example");
  });
});
