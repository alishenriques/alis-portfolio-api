import { describe, expect, it } from "vitest";
import { createTestApp } from "../test/helpers.js";

const project = (slug: string, extra = "") =>
  `{ slug: "${slug}", title: "T ${slug}", summary: "S", ${extra} }`;

describe("CMS authorization", () => {
  it.each([
    ["updateProfile", `mutation { updateProfile(input: { name: "A", headline: "B", bio: "C" }) { id } }`],
    ["upsertProject", `mutation { upsertProject(input: ${project("a")}) { id } }`],
    ["deleteProject", `mutation { deleteProject(slug: "a") }`],
    ["createUploadSignature", `mutation { createUploadSignature { signature } }`],
  ])("rejects %s without the CMS key", async (_name, query) => {
    const { gql } = await createTestApp();
    const result = await gql(query);
    expect(result.errors?.[0]?.extensions?.code).toBe("UNAUTHORIZED");
  });

  it("rejects a wrong CMS key", async () => {
    const { gql } = await createTestApp();
    const result = await gql(`mutation { deleteProject(slug: "a") }`, { key: "wrong-key" });
    expect(result.errors?.[0]?.extensions?.code).toBe("UNAUTHORIZED");
  });
});

describe("profile", () => {
  it("falls back to placeholder data until a profile is saved", async () => {
    const { gql } = await createTestApp();
    const result = await gql<{ profile: { name: string } }>("{ profile { name } }");
    expect(result.data?.profile.name).toBe("Alis");
  });

  it("saves and updates the single profile", async () => {
    const { gql } = await createTestApp({ cms: true });
    await gql(`mutation { updateProfile(input: { name: "One", headline: "H", bio: "B" }) { id } }`);
    await gql(`mutation { updateProfile(input: { name: "Two", headline: "H", bio: "B" }) { id } }`);

    const result = await gql<{ profile: { name: string } }>("{ profile { name } }");
    expect(result.data?.profile.name).toBe("Two");
  });

  it("returns a client-visible error for invalid input", async () => {
    const { gql } = await createTestApp({ cms: true });
    const result = await gql(`mutation { updateProfile(input: { name: "", headline: "H", bio: "B" }) { id } }`);
    expect(result.errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT");
    expect(result.errors?.[0]?.message).toContain("name");
  });
});

describe("projects", () => {
  it("creates, then replaces a project by slug", async () => {
    const { gql } = await createTestApp({ cms: true });
    await gql(`mutation { upsertProject(input: ${project("demo", 'tags: ["react"], publishedAt: "2020-01-01T00:00:00Z"')}) { id } }`);
    const updated = await gql<{ upsertProject: { title: string; tags: string[] } }>(
      `mutation { upsertProject(input: { slug: "demo", title: "New title", summary: "S", publishedAt: "2020-01-01T00:00:00Z" }) { title tags } }`,
    );

    expect(updated.data?.upsertProject).toEqual({ title: "New title", tags: [] });
    const list = await gql<{ projects: unknown[] }>("{ projects { slug } }");
    expect(list.data?.projects).toHaveLength(1);
  });

  it("hides drafts and future posts from the public but shows them to the CMS", async () => {
    const { gql } = await createTestApp({ cms: true });
    await gql(`mutation { upsertProject(input: ${project("live", 'publishedAt: "2020-01-01T00:00:00Z"')}) { id } }`);
    await gql(`mutation { upsertProject(input: ${project("draft")}) { id } }`);
    await gql(`mutation { upsertProject(input: ${project("future", 'publishedAt: "2999-01-01T00:00:00Z"')}) { id } }`);

    const asPublic = await gql<{ projects: { slug: string }[] }>("{ projects { slug } }", { cms: false });
    expect(asPublic.data?.projects.map((p) => p.slug)).toEqual(["live"]);

    const asCms = await gql<{ projects: { slug: string }[] }>("{ projects { slug } }", { cms: true });
    expect(asCms.data?.projects).toHaveLength(3);

    const draftPublic = await gql<{ project: unknown }>(`{ project(slug: "draft") { slug } }`, { cms: false });
    expect(draftPublic.data?.project).toBeNull();
    const draftCms = await gql<{ project: { slug: string } }>(`{ project(slug: "draft") { slug } }`, { cms: true });
    expect(draftCms.data?.project.slug).toBe("draft");
  });

  it("orders by sortOrder", async () => {
    const { gql } = await createTestApp({ cms: true });
    const pub = 'publishedAt: "2020-01-01T00:00:00Z"';
    await gql(`mutation { upsertProject(input: ${project("second", `${pub}, sortOrder: 2`)}) { id } }`);
    await gql(`mutation { upsertProject(input: ${project("first", `${pub}, sortOrder: 1`)}) { id } }`);

    const result = await gql<{ projects: { slug: string }[] }>("{ projects { slug } }");
    expect(result.data?.projects.map((p) => p.slug)).toEqual(["first", "second"]);
  });

  it("rejects an invalid slug", async () => {
    const { gql } = await createTestApp({ cms: true });
    const result = await gql(`mutation { upsertProject(input: ${project("Not A Slug")}) { id } }`);
    expect(result.errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT");
  });

  it("deletes a project and reports whether it existed", async () => {
    const { gql } = await createTestApp({ cms: true });
    await gql(`mutation { upsertProject(input: ${project("gone")}) { id } }`);

    const first = await gql<{ deleteProject: boolean }>(`mutation { deleteProject(slug: "gone") }`);
    const second = await gql<{ deleteProject: boolean }>(`mutation { deleteProject(slug: "gone") }`);
    expect([first.data?.deleteProject, second.data?.deleteProject]).toEqual([true, false]);
  });

  it("refuses to write when no database is configured", async () => {
    const { gql } = await createTestApp({ db: null, cms: true });
    const result = await gql(`mutation { upsertProject(input: ${project("a")}) { id } }`);
    expect(result.errors?.[0]?.extensions?.code).toBe("DATABASE_UNAVAILABLE");
  });
});

describe("createUploadSignature", () => {
  it("returns signed parameters without exposing the secret", async () => {
    const { gql } = await createTestApp({ cms: true });
    const result = await gql<{ createUploadSignature: Record<string, unknown> }>(
      `mutation { createUploadSignature { cloudName apiKey timestamp folder signature } }`,
    );
    const sig = result.data?.createUploadSignature;

    expect(sig).toMatchObject({ cloudName: "demo-cloud", apiKey: "123456789012345", folder: "alis-portfolio" });
    expect(String(sig?.signature)).toMatch(/^[a-f0-9]{40,64}$/);
    expect(JSON.stringify(result)).not.toContain("test-secret");
  });
});
