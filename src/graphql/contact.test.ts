import { describe, expect, it, vi } from "vitest";
import type { Resend } from "resend";
import { createTestApp } from "../test/helpers.js";

function fakeResend(sendResult: { data?: { id: string } | null; error?: { message: string } | null } = {}) {
  const send = vi
    .fn()
    .mockResolvedValue({ data: sendResult.data ?? { id: "email_1" }, error: sendResult.error ?? null });
  return { client: { emails: { send } } as unknown as Resend, send };
}

// GraphQL input object literal built from a JS object (see experience.test.ts for why).
function contactInput(overrides: Partial<Record<"name" | "email" | "message" | "website", string>> = {}) {
  const input = {
    name: "Alis",
    email: "visitor@example.com",
    message: "Olá, gostaria de conversar.",
    ...overrides,
  };
  return JSON.stringify(input).replace(/"([a-zA-Z]\w*)":/g, "$1:");
}

async function sendContact(
  gql: (query: string, opts?: { cms?: boolean }) => Promise<{
    data: { sendContactMessage: boolean } | null;
    errors?: { message: string; extensions?: { code?: string } }[];
  }>,
  overrides?: Parameters<typeof contactInput>[0],
) {
  return gql(`mutation { sendContactMessage(input: ${contactInput(overrides)}) }`);
}

describe("sendContactMessage", () => {
  it("is public — sends without a CMS key", async () => {
    const { client, send } = fakeResend();
    const { gql } = await createTestApp({ resend: client, db: null });

    const result = await sendContact(gql);

    expect(result.data?.sendContactMessage).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toMatchObject({
      to: "alishenriques@gmail.com",
      replyTo: "visitor@example.com",
    });
  });

  it("rejects an invalid email with a client-visible error", async () => {
    const { client, send } = fakeResend();
    const { gql } = await createTestApp({ resend: client, db: null });

    const result = await sendContact(gql, { email: "not-an-email" });

    expect(result.errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT");
    expect(send).not.toHaveBeenCalled();
  });

  it("reports EMAIL_UNAVAILABLE when Resend isn't configured", async () => {
    const { gql } = await createTestApp({ resend: null, db: null });

    const result = await sendContact(gql);

    expect(result.errors?.[0]?.extensions?.code).toBe("EMAIL_UNAVAILABLE");
  });

  it("reports EMAIL_SEND_FAILED when Resend returns an error", async () => {
    const { client, send } = fakeResend({ error: { message: "boom" } });
    const { gql } = await createTestApp({ resend: client, db: null });

    const result = await sendContact(gql);

    expect(result.errors?.[0]?.extensions?.code).toBe("EMAIL_SEND_FAILED");
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("silently skips sending when the honeypot field is filled", async () => {
    const { client, send } = fakeResend();
    const { gql } = await createTestApp({ resend: client, db: null });

    const result = await sendContact(gql, { website: "http://spam.example" });

    // Same success response as a real submission — a bot can't tell the
    // difference between "detected" and "sent".
    expect(result.data?.sendContactMessage).toBe(true);
    expect(send).not.toHaveBeenCalled();
  });
});
