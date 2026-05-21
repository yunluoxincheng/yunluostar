import { describe, it, expect } from "vitest";
import {
  botMessageRequestSchema,
  botMessageResponseSchema,
  botScopeSchema,
  botStreamEventSchema,
  pluginEventTraceSchema,
} from "../../src/bot/protocol.js";
import { botScopeFromRequest, botScopeToDataScope, deriveSessionId } from "../../src/bot/scope.js";

describe("Bot Protocol: botScopeSchema", () => {
  it("accepts a valid scope", () => {
    const scope = {
      platformId: "webhook",
      adapterId: "generic-http",
      conversationId: "conv-1",
      senderUserId: "user-1",
      sessionId: "sess-1",
    };
    expect(botScopeSchema.parse(scope)).toEqual(scope);
  });

  it("rejects scope with missing fields", () => {
    expect(() => botScopeSchema.parse({ platformId: "webhook" })).toThrow();
  });

  it("rejects scope with empty strings", () => {
    expect(() =>
      botScopeSchema.parse({
        platformId: "",
        adapterId: "a",
        conversationId: "c",
        senderUserId: "u",
        sessionId: "s",
      }),
    ).toThrow();
  });
});

describe("Bot Protocol: botMessageRequestSchema", () => {
  const validRequest = {
    platformId: "webhook",
    adapterId: "generic-http",
    conversationId: "demo-conversation",
    senderUserId: "demo-user",
    text: "hello",
  };

  it("accepts a valid minimal request", () => {
    const result = botMessageRequestSchema.parse(validRequest);
    expect(result.platformId).toBe("webhook");
    expect(result.text).toBe("hello");
  });

  it("accepts a request with all optional fields", () => {
    const result = botMessageRequestSchema.parse({
      ...validRequest,
      sessionId: "sess-1",
      messageId: "msg-1",
      timestamp: new Date().toISOString(),
      metadata: { key: "value" },
    });
    expect(result.sessionId).toBe("sess-1");
    expect(result.metadata).toEqual({ key: "value" });
  });

  it("rejects request with missing platformId", () => {
    expect(() => botMessageRequestSchema.parse({ ...validRequest, platformId: undefined })).toThrow();
  });

  it("rejects request with missing conversationId", () => {
    expect(() => botMessageRequestSchema.parse({ ...validRequest, conversationId: undefined })).toThrow();
  });

  it("rejects request with missing senderUserId", () => {
    expect(() => botMessageRequestSchema.parse({ ...validRequest, senderUserId: undefined })).toThrow();
  });

  it("rejects request with empty text", () => {
    expect(() => botMessageRequestSchema.parse({ ...validRequest, text: "  " })).toThrow();
  });

  it("rejects request with no text", () => {
    expect(() => botMessageRequestSchema.parse({ ...validRequest, text: undefined })).toThrow();
  });
});

describe("Bot Protocol: botMessageResponseSchema", () => {
  it("accepts a valid response with defaults", () => {
    const result = botMessageResponseSchema.parse({
      responseText: "Hello!",
      traceId: "trace-1",
      sessionId: "sess-1",
    });
    expect(result.memoryIds).toEqual([]);
    expect(result.goalIds).toEqual([]);
    expect(result.pluginEvents).toEqual([]);
  });

  it("accepts a response with all fields", () => {
    const result = botMessageResponseSchema.parse({
      responseText: "Hi",
      traceId: "trace-1",
      sessionId: "sess-1",
      episodeId: "ep-1",
      reflectionId: "ref-1",
      memoryIds: ["mem-1"],
      goalIds: ["goal-1"],
      pluginEvents: [{ pluginId: "p1", hook: "received", durationMs: 10 }],
    });
    expect(result.episodeId).toBe("ep-1");
    expect(result.pluginEvents).toHaveLength(1);
  });
});

describe("Bot Protocol: botStreamEventSchema", () => {
  it("accepts stage events", () => {
    const event = { type: "stage", traceId: "t1", stage: "thinking" };
    expect(botStreamEventSchema.parse(event)).toEqual(event);
  });

  it("accepts token events", () => {
    const event = { type: "token", traceId: "t1", token: "hello" };
    expect(botStreamEventSchema.parse(event)).toEqual(event);
  });

  it("accepts final events", () => {
    const event = {
      type: "final",
      traceId: "t1",
      response: {
        responseText: "hi",
        traceId: "t1",
        sessionId: "s1",
      },
    };
    expect(botStreamEventSchema.parse(event).type).toBe("final");
  });

  it("accepts error events", () => {
    const event = { type: "error", traceId: "t1", code: "err", message: "bad" };
    expect(botStreamEventSchema.parse(event)).toEqual(event);
  });

  it("accepts plugin events", () => {
    const event = {
      type: "plugin",
      traceId: "t1",
      event: { pluginId: "p1", hook: "received", durationMs: 5 },
    };
    expect(botStreamEventSchema.parse(event)).toEqual(event);
  });

  it("rejects unknown event types", () => {
    expect(() => botStreamEventSchema.parse({ type: "unknown", traceId: "t1" })).toThrow();
  });
});

describe("Bot Protocol: pluginEventTraceSchema", () => {
  it("accepts a valid trace", () => {
    const trace = { pluginId: "p1", hook: "received", durationMs: 10, output: { data: 1 } };
    expect(pluginEventTraceSchema.parse(trace)).toEqual(trace);
  });

  it("accepts trace without output", () => {
    const trace = { pluginId: "p1", hook: "responding", durationMs: 5 };
    expect(pluginEventTraceSchema.parse(trace).output).toBeUndefined();
  });
});

describe("Bot Scope: scope mapping", () => {
  const request = {
    platformId: "webhook",
    adapterId: "generic-http",
    conversationId: "conv-1",
    senderUserId: "user-1",
    text: "hello",
  };

  it("derives BotScope from request with stable sessionId when not provided", () => {
    const scope = botScopeFromRequest(request);
    expect(scope.platformId).toBe("webhook");
    expect(scope.adapterId).toBe("generic-http");
    expect(scope.conversationId).toBe("conv-1");
    expect(scope.senderUserId).toBe("user-1");
    expect(scope.sessionId).toBe("bot:webhook:generic-http:conv-1:user-1");
  });

  it("produces the same sessionId across multiple calls with identical Bot scope", () => {
    const scope1 = botScopeFromRequest(request);
    const scope2 = botScopeFromRequest(request);
    expect(scope1.sessionId).toBe(scope2.sessionId);
  });

  it("preserves existing sessionId", () => {
    const scope = botScopeFromRequest({ ...request, sessionId: "my-session" });
    expect(scope.sessionId).toBe("my-session");
  });

  it("maps BotScope to DataScope with prefixed identifiers", () => {
    const botScope = botScopeFromRequest(request);
    const dataScope = botScopeToDataScope(botScope);
    expect(dataScope.userId).toBe(`bot:webhook:user-1`);
    expect(dataScope.workspaceId).toBe(`bot:webhook:generic-http:conv-1`);
  });

  it("different conversations produce different workspaceIds", () => {
    const scope1 = botScopeToDataScope(botScopeFromRequest({ ...request, conversationId: "conv-1" }));
    const scope2 = botScopeToDataScope(botScopeFromRequest({ ...request, conversationId: "conv-2" }));
    expect(scope1.workspaceId).not.toBe(scope2.workspaceId);
  });

  it("different users produce different userIds", () => {
    const scope1 = botScopeToDataScope(botScopeFromRequest({ ...request, senderUserId: "user-1" }));
    const scope2 = botScopeToDataScope(botScopeFromRequest({ ...request, senderUserId: "user-2" }));
    expect(scope1.userId).not.toBe(scope2.userId);
  });

  it("derives sessionId from bot scope", () => {
    const scope = botScopeFromRequest(request);
    expect(deriveSessionId(scope)).toBe(scope.sessionId);
  });
});
