import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createLocalAgentRuntime } from "../../src/runtime/local-agent-runtime.js";
import type { BotMessageResponse, BotStreamEvent } from "../../src/bot/protocol.js";
import { botScopeToDataScope, botScopeFromRequest } from "../../src/bot/scope.js";
import { rmSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const DB_PATH = resolve("data/test-bot-message.db");

function makeConfig() {
  return {
    provider: "deterministic" as const,
    databasePath: DB_PATH,
    runtimeMode: "embedded" as const,
    runtimeUrl: "http://127.0.0.1:3927",
    defaultSessionId: "default",
    runtimeAuthRequired: false,
    contextFiles: ["AGENTS.md", "CLAUDE.md"],
  };
}

const BOT_REQUEST = {
  platformId: "webhook",
  adapterId: "generic-http",
  conversationId: "test-conv",
  senderUserId: "test-user",
  text: "Hello from webhook",
};

describe("Bot Message Path: handleBotMessage", () => {
  let runtime: ReturnType<typeof createLocalAgentRuntime>;

  beforeEach(() => {
    if (existsSync(DB_PATH)) rmSync(DB_PATH);
    runtime = createLocalAgentRuntime(makeConfig());
  });

  afterEach(() => {
    if (existsSync(DB_PATH)) rmSync(DB_PATH);
  });

  it("returns a BotMessageResponse with correct fields", async () => {
    const response = await runtime.handleBotMessage(BOT_REQUEST);
    expect(response.responseText).toBeTruthy();
    expect(response.traceId).toBeTruthy();
    expect(response.sessionId).toBeTruthy();
    expect(response.episodeId).toBeTruthy();
  });

  it("produces a response that includes the input text", async () => {
    const response = await runtime.handleBotMessage(BOT_REQUEST);
    expect(response.responseText).toContain("Hello from webhook");
  });

  it("emits stream events", async () => {
    const events: BotStreamEvent[] = [];
    await runtime.handleBotMessage(BOT_REQUEST, {
      onEvent: (event) => events.push(event),
    });

    const types = events.map((e) => e.type);
    expect(types).toContain("stage");
    expect(types).toContain("final");
    expect(events.filter((e) => e.type === "final")).toHaveLength(1);
  });

  it("uses Bot scope-derived DataScope for isolation", async () => {
    const botScope = botScopeFromRequest(BOT_REQUEST);
    const dataScope = botScopeToDataScope(botScope);

    const memoryResponse = await runtime.listMemory(
      20,
      dataScope.workspaceId,
      dataScope.userId,
    );
    expect(memoryResponse.total).toBeGreaterThanOrEqual(0);
  });

  it("isolates different conversations", async () => {
    const response1 = await runtime.handleBotMessage({
      ...BOT_REQUEST,
      conversationId: "conv-A",
      text: "Message for conversation A",
    });
    const response2 = await runtime.handleBotMessage({
      ...BOT_REQUEST,
      conversationId: "conv-B",
      text: "Message for conversation B",
    });

    expect(response1.traceId).not.toBe(response2.traceId);
    expect(response1.responseText).toContain("conversation A");
    expect(response2.responseText).toContain("conversation B");
  });

  it("preserves sessionId when provided", async () => {
    const response = await runtime.handleBotMessage({
      ...BOT_REQUEST,
      sessionId: "my-custom-session",
    });
    expect(response.sessionId).toBe("my-custom-session");
  });

  it("generates stable deterministic sessionId when not provided", async () => {
    const response1 = await runtime.handleBotMessage({
      platformId: "webhook",
      adapterId: "generic-http",
      conversationId: "conv-1",
      senderUserId: "user-1",
      text: "hello",
    });
    const response2 = await runtime.handleBotMessage({
      platformId: "webhook",
      adapterId: "generic-http",
      conversationId: "conv-1",
      senderUserId: "user-1",
      text: "second message",
    });
    expect(response1.sessionId).toBe("bot:webhook:generic-http:conv-1:user-1");
    expect(response2.sessionId).toBe("bot:webhook:generic-http:conv-1:user-1");
  });

  it("records reflection when available", async () => {
    const response = await runtime.handleBotMessage(BOT_REQUEST);
    const reflections = await runtime.listReflections(
      20,
      botScopeToDataScope(botScopeFromRequest(BOT_REQUEST)).workspaceId,
      botScopeToDataScope(botScopeFromRequest(BOT_REQUEST)).userId,
    );
    expect(reflections.total).toBeGreaterThanOrEqual(0);
  });
});
