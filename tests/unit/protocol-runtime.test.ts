import { describe, expect, it } from "vitest";
import { chatRequestSchema, runtimeEventSchema, runtimeStatusSchema } from "../../src/protocol/runtime.js";

describe("runtime protocol schemas", () => {
  it("validates chat requests with workspace context", () => {
    const parsed = chatRequestSchema.parse({
      requestId: "req-1",
      sessionId: "default",
      input: "hello",
      workspace: {
        workspaceId: "workspace",
        rootPath: "E:/workspace",
        instructionFiles: [{ path: "AGENTS.md", kind: "instruction", content: "rules" }],
      },
    });

    expect(parsed.client.streaming).toBe(true);
    expect(parsed.workspace?.instructionFiles[0].path).toBe("AGENTS.md");
  });

  it("rejects empty chat input", () => {
    expect(() => chatRequestSchema.parse({ requestId: "req-1", sessionId: "s", input: "   " })).toThrow();
  });

  it("validates runtime SSE events", () => {
    const event = runtimeEventSchema.parse({
      type: "stage",
      requestId: "req-1",
      stage: "thinking",
    });
    expect(event.stage).toBe("thinking");
  });

  it("requires storage to be runtime owned in status payloads", () => {
    expect(() => runtimeStatusSchema.parse({
      ok: true,
      mode: "local",
      version: "0.1.0",
      provider: "deterministic",
      providerReady: true,
      embeddingReady: true,
      authRequired: false,
      storage: { driver: "sqlite", ownedByRuntime: false },
    })).toThrow();
  });
});
