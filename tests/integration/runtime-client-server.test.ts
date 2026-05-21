import { afterEach, describe, expect, it } from "vitest";
import { unlinkSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { configSchema } from "../../src/config.js";
import { startRuntimeServer } from "../../src/runtime/server.js";
import { createRuntimeClient } from "../../src/runtime-client/client.js";
import { createChatRequest } from "../../src/runtime-client/chat.js";
import { createDbConnection, closeDbConnection } from "../../src/db/connection.js";
import { runMigrations } from "../../src/db/migrate.js";
import { createAuditLogRepository } from "../../src/db/audit-log-repository.js";

const dbFiles: string[] = [];

afterEach(() => {
  for (const file of dbFiles.splice(0)) {
    for (const suffix of ["", "-shm", "-wal"]) {
      const target = `${file}${suffix}`;
      if (existsSync(target)) unlinkSync(target);
    }
  }
});

describe("runtime HTTP/SSE integration", () => {
  it("streams a chat response through the runtime client", async () => {
    const dbPath = resolve(tmpdir(), `yunluo-runtime-${Date.now()}.db`);
    dbFiles.push(dbPath);
    const runtimeConfig = configSchema.parse({
      provider: "deterministic",
      databasePath: dbPath,
      runtimeMode: "local",
    });
    const server = await startRuntimeServer(runtimeConfig, { port: 0 });

    try {
      const clientConfig = configSchema.parse({
        runtimeMode: "local",
        runtimeUrl: server.url,
        databasePath: dbPath,
      });
      const client = createRuntimeClient(clientConfig);
      const tokens: string[] = [];
      const stages: string[] = [];

      const result = await client.chat(createChatRequest(clientConfig, "Remember that I prefer concise answers.", "s1"), {
        onEvent(event) {
          if (event.type === "token") tokens.push(event.token);
          if (event.type === "stage") stages.push(event.stage);
        },
      });

      expect(result.response).toContain("Response to:");
      expect(tokens.join("")).toBe(result.response);
      expect(stages).toContain("thinking");

      const memories = await client.listMemory(5);
      const self = await client.listSelfModel();
      const reflections = await client.listReflections(5);
      const session = await client.getSession("s1");

      expect(memories.total).toBeGreaterThanOrEqual(0);
      expect(self.total).toBeGreaterThanOrEqual(0);
      // CLI chat is ephemeral: no reflections or working memory snapshots written
      expect(reflections.total).toBe(0);
      expect(session.workingMemory).toBeUndefined();
    } finally {
      await server.close();
    }
  });

  it("reports runtime status with runtime-owned SQLite storage", async () => {
    const dbPath = resolve(tmpdir(), `yunluo-status-${Date.now()}.db`);
    dbFiles.push(dbPath);
    const config = configSchema.parse({ databasePath: dbPath, runtimeMode: "local" });
    const server = await startRuntimeServer(config, { port: 0 });

    try {
      const client = createRuntimeClient(configSchema.parse({ runtimeMode: "local", runtimeUrl: server.url }));
      const status = await client.status();
      expect(status.ok).toBe(true);
      expect(status.storage.ownedByRuntime).toBe(true);
      await expect(client.sendToolResult({
        requestId: "req-1",
        toolRequestId: "tool-1",
        status: "denied",
        error: "denied by test",
      })).resolves.toBeUndefined();
    } finally {
      await server.close();
    }
  });

  it("streams runtime tool request events for explicit local tool requests", async () => {
    const dbPath = resolve(tmpdir(), `yunluo-tool-request-${Date.now()}.db`);
    dbFiles.push(dbPath);
    const runtimeConfig = configSchema.parse({
      provider: "deterministic",
      databasePath: dbPath,
      runtimeMode: "local",
    });
    const server = await startRuntimeServer(runtimeConfig, { port: 0 });

    try {
      const clientConfig = configSchema.parse({
        runtimeMode: "local",
        runtimeUrl: server.url,
        databasePath: dbPath,
      });
      const client = createRuntimeClient(clientConfig);
      const toolRequests: string[] = [];

      await client.chat(createChatRequest(clientConfig, "tool:read_file {\"path\":\"README.md\"}", "tools"), {
        async onEvent(event) {
          if (event.type === "tool_request") toolRequests.push(event.toolRequest.name);
          if (event.type === "tool_request") {
            await client.sendToolResult({
              requestId: event.requestId,
              toolRequestId: event.toolRequest.id,
              status: "denied",
              error: "denied by event test",
            });
          }
        },
      });

      expect(toolRequests).toEqual(["read_file"]);
    } finally {
      await server.close();
    }
  });

  it("continues the same chat turn with returned local tool results", async () => {
    const dbPath = resolve(tmpdir(), `yunluo-tool-continuation-${Date.now()}.db`);
    dbFiles.push(dbPath);
    const runtimeConfig = configSchema.parse({
      provider: "deterministic",
      databasePath: dbPath,
      runtimeMode: "local",
    });
    const server = await startRuntimeServer(runtimeConfig, { port: 0 });

    try {
      const clientConfig = configSchema.parse({
        runtimeMode: "local",
        runtimeUrl: server.url,
        databasePath: dbPath,
      });
      const client = createRuntimeClient(clientConfig);

      const result = await client.chat(createChatRequest(clientConfig, "tool:read_file {\"path\":\"README.md\"}", "tool-continuation"), {
        async onEvent(event) {
          if (event.type === "tool_request") {
            await client.sendToolResult({
              requestId: event.requestId,
              toolRequestId: event.toolRequest.id,
              status: "approved",
              output: "TOOL_OUTPUT_VISIBLE_IN_SAME_TURN",
            });
          }
        },
      });

      expect(result.response).toContain("TOOL_OUTPUT_VISIBLE_IN_SAME_TURN");
    } finally {
      await server.close();
    }
  });

  it("keeps a chat turn paused for manual tool approval beyond five seconds", async () => {
    const dbPath = resolve(tmpdir(), `yunluo-tool-wait-${Date.now()}.db`);
    dbFiles.push(dbPath);
    const runtimeConfig = configSchema.parse({
      provider: "deterministic",
      databasePath: dbPath,
      runtimeMode: "local",
    });
    const server = await startRuntimeServer(runtimeConfig, { port: 0 });

    try {
      const clientConfig = configSchema.parse({
        runtimeMode: "local",
        runtimeUrl: server.url,
        databasePath: dbPath,
      });
      const client = createRuntimeClient(clientConfig);

      const result = await client.chat(createChatRequest(clientConfig, "tool:read_file {\"path\":\"README.md\"}", "tool-wait"), {
        async onEvent(event) {
          if (event.type === "tool_request") {
            await new Promise((resolveDelay) => setTimeout(resolveDelay, 5_200));
            await client.sendToolResult({
              requestId: event.requestId,
              toolRequestId: event.toolRequest.id,
              status: "approved",
              output: "TOOL_OUTPUT_AFTER_MANUAL_APPROVAL_DELAY",
            });
          }
        },
      });

      expect(result.response).toContain("TOOL_OUTPUT_AFTER_MANUAL_APPROVAL_DELAY");
    } finally {
      await server.close();
    }
  }, 15_000);

  it("isolates session state by workspace id", async () => {
    const dbPath = resolve(tmpdir(), `yunluo-isolation-${Date.now()}.db`);
    dbFiles.push(dbPath);
    const runtimeConfig = configSchema.parse({
      provider: "deterministic",
      databasePath: dbPath,
      runtimeMode: "local",
    });
    const server = await startRuntimeServer(runtimeConfig, { port: 0 });

    try {
      const clientConfig = configSchema.parse({
        runtimeMode: "local",
        runtimeUrl: server.url,
        databasePath: dbPath,
      });
      const client = createRuntimeClient(clientConfig);
      const workspaceA = resolve(tmpdir(), `yunluo-workspace-a-${Date.now()}`);
      const workspaceB = resolve(tmpdir(), `yunluo-workspace-b-${Date.now()}`);

      await client.chat(createChatRequest(clientConfig, "hello from workspace A", "shared-session", workspaceA));

      const sessionAResponse = await fetch(`${server.url}/v1/session/shared-session?workspaceId=${encodeURIComponent(workspaceA)}`);
      const sessionBResponse = await fetch(`${server.url}/v1/session/shared-session?workspaceId=${encodeURIComponent(workspaceB)}`);
      const sessionA = await sessionAResponse.json() as { workingMemory?: unknown };
      const sessionB = await sessionBResponse.json() as { workingMemory?: unknown };

      // CLI chat is ephemeral: no working memory snapshots written
      expect(sessionA.workingMemory).toBeUndefined();
      expect(sessionB.workingMemory).toBeUndefined();
    } finally {
      await server.close();
    }
  });

  it("rejects invalid hosted tokens and isolates session state by authenticated user", async () => {
    const dbPath = resolve(tmpdir(), `yunluo-auth-isolation-${Date.now()}.db`);
    dbFiles.push(dbPath);
    const runtimeConfig = configSchema.parse({
      provider: "deterministic",
      databasePath: dbPath,
      runtimeMode: "local",
      runtimeAuthRequired: true,
    });
    const server = await startRuntimeServer(runtimeConfig, {
      port: 0,
      authUsers: {
        "token-a": "user-a",
        "token-b": "user-b",
      },
    });

    try {
      const clientConfig = configSchema.parse({
        runtimeMode: "local",
        runtimeUrl: server.url,
        databasePath: dbPath,
      });
      const request = createChatRequest(clientConfig, "hello from user A", "shared-session");

      const invalid = await fetch(`${server.url}/v1/session/shared-session`, {
        headers: { authorization: "Bearer invalid-token" },
      });
      expect(invalid.status).toBe(401);

      const chat = await fetch(`${server.url}/v1/chat`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer token-a",
        },
        body: JSON.stringify(request),
      });
      expect(chat.status).toBe(200);
      await chat.text();

      const userA = await fetch(`${server.url}/v1/session/shared-session?workspaceId=${encodeURIComponent(request.workspace?.workspaceId ?? "")}`, {
        headers: { authorization: "Bearer token-a" },
      });
      const userB = await fetch(`${server.url}/v1/session/shared-session?workspaceId=${encodeURIComponent(request.workspace?.workspaceId ?? "")}`, {
        headers: { authorization: "Bearer token-b" },
      });
      const sessionA = await userA.json() as { workingMemory?: unknown };
      const sessionB = await userB.json() as { workingMemory?: unknown };

      // CLI chat is ephemeral: no working memory snapshots written for any user
      expect(sessionA.workingMemory).toBeUndefined();
      expect(sessionB.workingMemory).toBeUndefined();
    } finally {
      await server.close();
    }
  });

  it("persists tool results to runtime audit logs", async () => {
    const dbPath = resolve(tmpdir(), `yunluo-tool-audit-${Date.now()}.db`);
    dbFiles.push(dbPath);
    const config = configSchema.parse({ databasePath: dbPath, runtimeMode: "local" });
    const server = await startRuntimeServer(config, { port: 0 });

    try {
      const result = await fetch(`${server.url}/v1/tools/result?workspaceId=${encodeURIComponent("workspace-tools")}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requestId: "req-audit",
          toolRequestId: "tool-audit",
          status: "denied",
          error: "denied by test",
        }),
      });
      expect(result.status).toBe(202);

      const db = createDbConnection(dbPath);
      try {
        runMigrations(db);
        const auditRepo = createAuditLogRepository(db, { userId: "local-user", workspaceId: "workspace-tools" });
        const rows = auditRepo.findByTarget("local_tool_results", "tool-audit");
        expect(rows).toHaveLength(1);
        expect(rows[0].afterValue).toContain("denied by test");
      } finally {
        closeDbConnection(db);
      }

      const memory = await fetch(`${server.url}/v1/memory?workspaceId=${encodeURIComponent("workspace-tools")}`);
      const memoryPayload = await memory.json() as { items: Array<{ category?: string; content?: string }> };
      expect(memoryPayload.items.some((item) =>
        item.category === "tool_result" && item.content?.includes("denied by test")
      )).toBe(true);
    } finally {
      await server.close();
    }
  });
});
