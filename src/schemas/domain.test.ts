import { describe, expect, it } from "vitest";
import { profileSchema, projectSchema, updateProfileInputSchema } from "./domain";

describe("domain schemas", () => {
  it("accepts a valid profile", () => {
    const profile = profileSchema.parse({
      id: "profile_1",
      name: "Alis",
      headline: "Product engineer",
      bio: "Builds interactive web experiences.",
      avatarUrl: null,
    });

    expect(profile.name).toBe("Alis");
  });

  it("rejects an empty project title", () => {
    expect(() =>
      projectSchema.parse({
        id: "1",
        slug: "demo",
        title: "",
        summary: "x",
        body: "x",
        coverUrl: null,
        tags: [],
        featured: false,
        publishedAt: null,
      }),
    ).toThrow();
  });

  it("requires CMS mutation fields", () => {
    expect(() => updateProfileInputSchema.parse({ name: "A" })).toThrow();
  });
});
