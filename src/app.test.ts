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

  it("rejects CMS mutations without the API key", async () => {
    const result = await query(
      `mutation { updateProfile(input: { name: "A", headline: "B", bio: "C" }) { id } }`,
    );
    expect(result.errors[0].message).toContain("Unauthorized");
  });
});
