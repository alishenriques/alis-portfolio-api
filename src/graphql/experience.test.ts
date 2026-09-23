import { describe, expect, it } from "vitest";
import { createTestApp } from "../test/helpers.js";

type ExperienceInput = {
  id?: string;
  company: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  sortOrder?: number;
};

// GraphQL input object literal built from a JS object: avoids duplicate-field
// mistakes you'd get concatenating raw query strings by hand.
function experience(overrides: ExperienceInput) {
  const input = { role: "Engineer", startDate: "2020-01", description: "D", ...overrides };
  return JSON.stringify(input).replace(/"([a-zA-Z]\w*)":/g, "$1:");
}

/** Runs a mutation and fails the test immediately if the API returned errors. */
async function mutate<T>(gql: (query: string) => Promise<{ data: T | null; errors?: { message: string }[] }>, query: string) {
  const result = await gql(query);
  if (result.errors?.length) {
    throw new Error(`GraphQL errors: ${result.errors.map((e) => e.message).join("; ")}`);
  }
  return result.data as T;
}

describe("experiences", () => {
  it("creates a new experience when no id is given", async () => {
    const { gql } = await createTestApp({ cms: true });
    const data = await mutate<{ upsertExperience: { id: string; company: string } }>(
      gql,
      `mutation { upsertExperience(input: ${experience({ company: "Acme" })}) { id company } }`,
    );

    expect(data.upsertExperience.company).toBe("Acme");
    expect(data.upsertExperience.id).toBeTruthy();
  });

  it("updates an existing experience when its id is given", async () => {
    const { gql } = await createTestApp({ cms: true });
    const created = await mutate<{ upsertExperience: { id: string } }>(
      gql,
      `mutation { upsertExperience(input: ${experience({ company: "Acme" })}) { id } }`,
    );
    const id = created.upsertExperience.id;

    const updated = await mutate<{ upsertExperience: { id: string; role: string } }>(
      gql,
      `mutation { upsertExperience(input: ${experience({ id, company: "Acme", role: "Staff Engineer" })}) { id role } }`,
    );

    expect(updated.upsertExperience.id).toBe(id);
    expect(updated.upsertExperience.role).toBe("Staff Engineer");

    const list = await mutate<{ experiences: unknown[] }>(gql, "{ experiences { id } }");
    expect(list.experiences).toHaveLength(1);
  });

  it("orders by sortOrder, then most recent startDate first", async () => {
    const { gql } = await createTestApp({ cms: true });
    await mutate(gql, `mutation { upsertExperience(input: ${experience({ company: "Old", startDate: "2018-01" })}) { id } }`);
    await mutate(gql, `mutation { upsertExperience(input: ${experience({ company: "New", startDate: "2022-01" })}) { id } }`);
    await mutate(gql, `mutation { upsertExperience(input: ${experience({ company: "Pinned", sortOrder: -1 })}) { id } }`);

    const data = await mutate<{ experiences: { company: string }[] }>(gql, "{ experiences { company } }");
    expect(data.experiences.map((e) => e.company)).toEqual(["Pinned", "New", "Old"]);
  });

  it("rejects an endDate before startDate", async () => {
    const { gql } = await createTestApp({ cms: true });
    const result = await gql(
      `mutation { upsertExperience(input: { company: "C", role: "R", startDate: "2022-01", endDate: "2020-01", description: "D" }) { id } }`,
    );
    expect(result.errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT");
  });

  it("rejects a malformed date", async () => {
    const { gql } = await createTestApp({ cms: true });
    const result = await gql(
      `mutation { upsertExperience(input: { company: "C", role: "R", startDate: "2022/01", description: "D" }) { id } }`,
    );
    expect(result.errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT");
  });

  it("deletes an experience and reports whether it existed", async () => {
    const { gql } = await createTestApp({ cms: true });
    const created = await mutate<{ upsertExperience: { id: string } }>(
      gql,
      `mutation { upsertExperience(input: ${experience({ company: "Acme" })}) { id } }`,
    );
    const id = created.upsertExperience.id;

    const first = await gql<{ deleteExperience: boolean }>(`mutation { deleteExperience(id: "${id}") }`);
    const second = await gql<{ deleteExperience: boolean }>(`mutation { deleteExperience(id: "${id}") }`);
    expect([first.data?.deleteExperience, second.data?.deleteExperience]).toEqual([true, false]);
  });

  it("returns an empty list without a database", async () => {
    const { gql } = await createTestApp({ db: null });
    const result = await gql<{ experiences: unknown[] }>("{ experiences { id } }");
    expect(result.data?.experiences).toEqual([]);
  });
});
