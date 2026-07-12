import { test, expect } from "@playwright/test";
import { POSTMARK_INBOUND_AUTH, API_BASE_URL } from "../helpers/constants";

// This endpoint lives on the Express API, not the Vite frontend that
// playwright.config.ts's `baseURL` points at, so every call below uses an
// explicit absolute URL (built from API_BASE_URL) rather than a relative
// path off the `request` fixture.
const WEBHOOK_URL = `${API_BASE_URL}/api/webhooks/email`;

const BASIC_AUTH_HEADER =
  "Basic " +
  Buffer.from(`${POSTMARK_INBOUND_AUTH.username}:${POSTMARK_INBOUND_AUTH.password}`).toString(
    "base64"
  );

/** Generates a unique MessageID so tests never collide with each other or a re-run. */
function uniqueMessageId(label: string): string {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `<${label}-${unique}@postmark.test>`;
}

function validPayload(overrides?: Record<string, unknown>) {
  return {
    FromFull: { Email: "sender@example.com", Name: "Sender Name" },
    Subject: "Some subject",
    MessageID: uniqueMessageId("valid"),
    TextBody: "The email body text.",
    ...overrides,
  };
}

test.describe("POST /api/webhooks/email", () => {
  test("valid payload with a fresh MessageID creates a ticket", async ({ request }) => {
    const payload = validPayload();

    const response = await request.post(WEBHOOK_URL, {
      headers: { Authorization: BASIC_AUTH_HEADER },
      data: payload,
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.status).toBe("created");
    expect(typeof body.ticketId).toBe("string");
    expect(body.ticketId.length).toBeGreaterThan(0);
  });

  test("re-posting the same MessageID returns the original ticket as a duplicate", async ({
    request,
  }) => {
    const payload = validPayload();

    const first = await request.post(WEBHOOK_URL, {
      headers: { Authorization: BASIC_AUTH_HEADER },
      data: payload,
    });
    expect(first.status()).toBe(201);
    const firstBody = await first.json();

    const second = await request.post(WEBHOOK_URL, {
      headers: { Authorization: BASIC_AUTH_HEADER },
      data: payload,
    });
    expect(second.status()).toBe(200);
    const secondBody = await second.json();

    expect(secondBody.status).toBe("duplicate");
    expect(secondBody.ticketId).toBe(firstBody.ticketId);
  });

  test("missing Authorization header is rejected", async ({ request }) => {
    const response = await request.post(WEBHOOK_URL, {
      data: validPayload(),
    });

    expect(response.status()).toBe(401);
    expect(response.headers()["www-authenticate"]).toContain("Basic");
    const body = await response.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  test("wrong Basic Auth credentials are rejected", async ({ request }) => {
    const wrongAuth =
      "Basic " + Buffer.from("wrong-user:wrong-password").toString("base64");

    const response = await request.post(WEBHOOK_URL, {
      headers: { Authorization: wrongAuth },
      data: validPayload(),
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  test("payload missing MessageID is rejected as malformed", async ({ request }) => {
    const { MessageID: _MessageID, ...payloadWithoutMessageId } = validPayload();

    const response = await request.post(WEBHOOK_URL, {
      headers: { Authorization: BASIC_AUTH_HEADER },
      data: payloadWithoutMessageId,
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(typeof body.error).toBe("string");
  });

  test("payload with both TextBody and HtmlBody empty is rejected as malformed", async ({
    request,
  }) => {
    const payload = validPayload({ TextBody: "", HtmlBody: "" });

    const response = await request.post(WEBHOOK_URL, {
      headers: { Authorization: BASIC_AUTH_HEADER },
      data: payload,
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(typeof body.error).toBe("string");
  });
});
