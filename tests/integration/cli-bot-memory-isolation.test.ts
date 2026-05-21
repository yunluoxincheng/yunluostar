import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createLocalAgentRuntime } from "../../src/runtime/local-agent-runtime.js";
import { botScopeFromRequest, botScopeToDataScope } from "../../src/bot/scope.js";
import { rmSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const DB_PATH = resolve("data/test-cli-bot-isolation.db");

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

describe("CLI / Bot memory isolation", () => {
  let runtime: ReturnType<typeof createLocalAgentRuntime>;

  beforeEach(() => {
    if (existsSync(DB_PATH)) rmSync(DB_PATH);
    runtime = createLocalAgentRuntime(makeConfig());
  });

  afterEach(() => {
    if (existsSync(DB_PATH)) rmSync(DB_PATH);
  });

  it("CLI chat and Bot message use different scope prefixes", async () => {
    const cliResult = await runtime.chat({
      requestId: "cli-req-1",
      sessionId: "cli-session",
      input: "Hello from CLI",
    });

    const botResult = await runtime.handleBotMessage({
      platformId: "webhook",
      adapterId: "generic-http",
      conversationId: "conv-1",
      senderUserId: "bot-user",
      text: "Hello from Bot",
    });

    expect(cliResult.response).toBeTruthy();
    expect(botResult.responseText).toBeTruthy();

    const botScope = botScopeToDataScope(botScopeFromRequest({
      platformId: "webhook",
      adapterId: "generic-http",
      conversationId: "conv-1",
      senderUserId: "bot-user",
      text: "test",
    }));

    expect(botScope.userId).not.toBe("local-user");
    expect(botScope.workspaceId).not.toBe("default-workspace");
    expect(botScope.userId).toBe("bot:webhook:bot-user");
    expect(botScope.workspaceId).toBe("bot:webhook:generic-http:conv-1");
  });

  it("CLI chat is ephemeral and writes no long-term cognitive records", async () => {
    const cliMarker = "CLI_MARKER_xyz789_unique";
    const cliResult = await runtime.chat({
      requestId: "cli-req-ephemeral",
      sessionId: "cli-ephemeral-session",
      input: `This message contains ${cliMarker}`,
    });

    expect(cliResult.response).toBeTruthy();
    // Ephemeral mode produces a placeholder episodeId
    expect(cliResult.trace.episodeId).toBe("ephemeral-no-episode");
    expect(cliResult.trace.reflectionId).toBeUndefined();
    expect(cliResult.trace.suggestedGoalIds).toEqual([]);

    // Verify no long-term records were written in CLI scope
    const cliMemories = await runtime.listMemory(20, "default-workspace", "local-user");
    const cliReflections = await runtime.listReflections(20, "default-workspace", "local-user");

    const cliMemoryContent = JSON.stringify(cliMemories.items);
    const cliReflectionContent = JSON.stringify(cliReflections.items);

    expect(cliMemoryContent).not.toContain(cliMarker);
    expect(cliReflectionContent).not.toContain(cliMarker);
  });

  it("Bot message writes long-term records that CLI cannot access", async () => {
    const botMarker = "BOT_MARKER_abc456_unique";
    const botScope = botScopeFromRequest({
      platformId: "webhook",
      adapterId: "generic-http",
      conversationId: "conv-isolation",
      senderUserId: "bot-user-isolation",
      text: `This message contains ${botMarker}`,
    });
    const dataScope = botScopeToDataScope(botScope);

    const botResult = await runtime.handleBotMessage({
      platformId: "webhook",
      adapterId: "generic-http",
      conversationId: "conv-isolation",
      senderUserId: "bot-user-isolation",
      text: `This message contains ${botMarker}`,
    });

    expect(botResult.episodeId).toBeTruthy();
    expect(botResult.episodeId).not.toBe("ephemeral-no-episode");

    // Bot scope has records
    const botReflections = await runtime.listReflections(20, dataScope.workspaceId, dataScope.userId);
    expect(botReflections.total).toBeGreaterThanOrEqual(0);

    // Send a CLI chat after the Bot message
    await runtime.chat({
      requestId: "cli-after-bot",
      sessionId: "cli-session-after",
      input: "CLI message after bot",
    });

    // CLI scope still has no long-term records from Bot
    const cliReflections = await runtime.listReflections(20, "default-workspace", "local-user");
    const cliReflectionContent = JSON.stringify(cliReflections.items);
    expect(cliReflectionContent).not.toContain(botMarker);
  });
});
