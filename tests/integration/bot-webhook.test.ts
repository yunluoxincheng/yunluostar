import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRuntimeHttpServer } from "../../src/runtime/server.js";
import { rmSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const DB_PATH = resolve("data/test-bot-webhook.db");

function makeConfig() {
  return {
    provider: "deterministic" as const,
    databasePath: DB_PATH,
    runtimeMode: "local" as const,
    runtimeUrl: "http://127.0.0.1:3927",
    defaultSessionId: "default",
    runtimeAuthRequired: false,
    contextFiles: ["AGENTS.md", "CLAUDE.md"],
  };
}

async function fetchJson(url: string, options?: RequestInit): Promise<{ status: number; body: unknown }> {
  const res = await fetch(url, {
    ...options,
    headers: { "content-type": "application/json", ...options?.headers },
  });
  return { status: res.status, body: await res.json() };
}

const WEBHOOK_PAYLOAD = {
  platformId: "webhook",
  adapterId: "generic-http",
  conversationId: "test-conv",
  senderUserId: "test-user",
  text: "Hello from webhook",
};

describe("HTTP Webhook Adapter: POST /v1/bot/message", () => {
  let baseUrl: string;
  let close: () => Promise<void>;

  beforeEach(async () => {
    if (existsSync(DB_PATH)) rmSync(DB_PATH);
    const server = createRuntimeHttpServer(makeConfig());
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const addr = server.address() as { port: number };
    baseUrl = `http://127.0.0.1:${addr.port}`;
    close = () => new Promise<void>((res, rej) => server.close((e) => e ? rej(e) : res()));
  });

  afterEach(async () => {
    await close();
    if (existsSync(DB_PATH)) rmSync(DB_PATH);
  });

  it("accepts a valid webhook payload and returns BotMessageResponse", async () => {
    const { status, body } = await fetchJson(`${baseUrl}/v1/bot/message`, {
      method: "POST",
      body: JSON.stringify(WEBHOOK_PAYLOAD),
    });
    expect(status).toBe(200);
    const resp = body as Record<string, unknown>;
    expect(resp.responseText).toBeTruthy();
    expect(resp.traceId).toBeTruthy();
    expect(resp.sessionId).toBeTruthy();
  });

  it("returns validation error for missing platformId", async () => {
    const { status } = await fetchJson(`${baseUrl}/v1/bot/message`, {
      method: "POST",
      body: JSON.stringify({ ...WEBHOOK_PAYLOAD, platformId: undefined }),
    });
    expect(status).toBe(400);
  });

  it("returns validation error for empty text", async () => {
    const { status } = await fetchJson(`${baseUrl}/v1/bot/message`, {
      method: "POST",
      body: JSON.stringify({ ...WEBHOOK_PAYLOAD, text: "" }),
    });
    expect(status).toBe(400);
  });

  it("returns validation error for missing conversationId", async () => {
    const { status } = await fetchJson(`${baseUrl}/v1/bot/message`, {
      method: "POST",
      body: JSON.stringify({ ...WEBHOOK_PAYLOAD, conversationId: undefined }),
    });
    expect(status).toBe(400);
  });

  it("accepts optional metadata field", async () => {
    const { status, body } = await fetchJson(`${baseUrl}/v1/bot/message`, {
      method: "POST",
      body: JSON.stringify({ ...WEBHOOK_PAYLOAD, metadata: { source: "ci-test" } }),
    });
    expect(status).toBe(200);
    expect((body as Record<string, unknown>).responseText).toBeTruthy();
  });
});

describe("WebChat API: POST /v1/bot/message/stream", () => {
  let baseUrl: string;
  let close: () => Promise<void>;

  beforeEach(async () => {
    if (existsSync(DB_PATH)) rmSync(DB_PATH);
    const server = createRuntimeHttpServer(makeConfig());
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const addr = server.address() as { port: number };
    baseUrl = `http://127.0.0.1:${addr.port}`;
    close = () => new Promise<void>((res, rej) => server.close((e) => e ? rej(e) : res()));
  });

  afterEach(async () => {
    await close();
    if (existsSync(DB_PATH)) rmSync(DB_PATH);
  });

  it("streams Bot stream events via SSE", async () => {
    const res = await fetch(`${baseUrl}/v1/bot/message/stream`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(WEBHOOK_PAYLOAD),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");

    const text = await res.text();
    const eventTypes: string[] = [];
    for (const line of text.split("\n")) {
      if (line.startsWith("event: ")) {
        eventTypes.push(line.slice("event: ".length).trim());
      }
    }
    expect(eventTypes).toContain("stage");
    expect(eventTypes).toContain("final");
  });

  it("returns validation error for invalid payload", async () => {
    const res = await fetch(`${baseUrl}/v1/bot/message/stream`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "" }),
    });
    expect(res.status).toBe(400);
  });
});
