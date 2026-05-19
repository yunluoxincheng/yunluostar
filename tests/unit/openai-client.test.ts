import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OpenAICompatibleLLMClient } from "../../src/llm/openai-compatible-client.js";

const mockFetch = vi.fn();
const originalFetch = globalThis.fetch;

beforeEach(() => {
  globalThis.fetch = mockFetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  mockFetch.mockReset();
});

function makeClient(overrides?: { timeout?: number; maxRetries?: number }) {
  return new OpenAICompatibleLLMClient({
    baseUrl: "https://api.test.com/v1",
    apiKey: "test-key",
    model: "test-model",
    temperature: 0.7,
    maxRetries: 0,
    ...overrides,
  });
}

function mockResponse(content: string, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve({
      choices: [{ message: { content } }],
    }),
    text: () => Promise.resolve(""),
  } as Response);
}

function mockStreamResponse(chunks: string[]) {
  const lines = chunks.map(c => `data: ${JSON.stringify({ choices: [{ delta: { content: c } }] })}`).join("\n");
  const body = lines + "\ndata: [DONE]\n";
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(body));
      controller.close();
    },
  });
  return Promise.resolve({
    ok: true,
    status: 200,
    statusText: "OK",
    body: stream,
    text: () => Promise.resolve(""),
    json: () => Promise.resolve({}),
  } as unknown as Response);
}

describe("OpenAICompatibleLLMClient", () => {
  it("sends correct request shape for generateResponse", async () => {
    mockFetch.mockReturnValue(mockResponse("Hello!"));

    const client = makeClient();
    const result = await client.generateResponse("", "Hi");

    expect(result).toBe("Hello!");
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.test.com/v1/chat/completions");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("test-model");
    expect(body.temperature).toBe(0.7);
    expect(body.messages).toEqual([{ role: "user", content: "Hi" }]);
    expect(init.headers.Authorization).toBe("Bearer test-key");
  });

  it("includes system context when provided", async () => {
    mockFetch.mockReturnValue(mockResponse("Response"));

    const client = makeClient();
    await client.generateResponse("You are helpful", "Hi");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.messages[0]).toEqual({ role: "system", content: "You are helpful" });
    expect(body.messages[1]).toEqual({ role: "user", content: "Hi" });
  });

  it("parses episode extraction with safe fallback", async () => {
    mockFetch.mockReturnValue(mockResponse(JSON.stringify({
      intent: "test",
      action: "acted",
      outcome: "done",
      lesson: "learned",
      importance: 0.8,
      confidence: 0.9,
    })));

    const client = makeClient();
    const result = await client.extractEpisode("user input", "agent response");

    expect(result.intent).toBe("test");
    expect(result.importance).toBe(0.8);
  });

  it("falls back on malformed episode extraction", async () => {
    mockFetch.mockReturnValue(mockResponse("not valid json"));

    const client = makeClient();
    const result = await client.extractEpisode("user input", "agent response");

    expect(result.intent).toBe("general inquiry");
    expect(result.importance).toBe(0.5);
  });

  it("parses reflection output", async () => {
    mockFetch.mockReturnValue(mockResponse(JSON.stringify({
      whatWorked: "good",
      whatFailed: "bad",
      lessons: "learned",
      updateCandidates: "[]",
    })));

    const client = makeClient();
    const result = await client.reflect("input", "response", "context");

    expect(result.whatWorked).toBe("good");
  });

  it("falls back on malformed reflection", async () => {
    mockFetch.mockReturnValue(mockResponse(null));

    const client = makeClient();
    const result = await client.reflect("input", "response", "context");

    expect(result.whatWorked).toBe("Response generated");
  });

  it("parses consolidation output", async () => {
    mockFetch.mockReturnValue(mockResponse(JSON.stringify({
      semanticMemories: [{ content: "mem", category: "test", importance: 0.5, confidence: 0.5 }],
      userModelUpdates: [],
      selfModelUpdates: [],
    })));

    const client = makeClient();
    const result = await client.consolidate(
      { intent: "test", action: "a", outcome: "o", lesson: "l", importance: 0.5, confidence: 0.5 },
      { whatWorked: "w", whatFailed: "f", lessons: "l", updateCandidates: "[]" },
    );

    expect(result.semanticMemories).toHaveLength(1);
  });

  it("falls back on malformed consolidation", async () => {
    mockFetch.mockReturnValue(mockResponse("bad"));

    const client = makeClient();
    const result = await client.consolidate(
      { intent: "test", action: "a", outcome: "o", lesson: "l", importance: 0.5, confidence: 0.5 },
      { whatWorked: "w", whatFailed: "f", lessons: "l", updateCandidates: "[]" },
    );

    expect(result.semanticMemories).toHaveLength(0);
  });

  it("throws on HTTP error", async () => {
    mockFetch.mockReturnValue(Promise.resolve({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: () => Promise.resolve("Invalid API key"),
    } as Response));

    const client = makeClient();
    await expect(client.generateResponse("", "Hi")).rejects.toThrow("LLM request failed: 401");
  });

  it("throws on network error", async () => {
    mockFetch.mockRejectedValue(new TypeError("fetch failed"));

    const client = makeClient();
    await expect(client.generateResponse("", "Hi")).rejects.toThrow("LLM request failed: fetch failed");
  });

  it("throws on timeout", async () => {
    mockFetch.mockImplementation((_url: string, _init: RequestInit) => {
      return new Promise((_, reject) => {
        setTimeout(() => {
          const err = new DOMException("The operation was aborted", "AbortError");
          reject(err);
        }, 10);
      });
    });

    const client = makeClient({ timeout: 5 });
    await expect(client.generateResponse("", "Hi")).rejects.toThrow("timed out");
  });

  it("retries on 429 and succeeds", async () => {
    const errorResponse = {
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      text: () => Promise.resolve("Rate limited"),
    };
    mockFetch
      .mockReturnValueOnce(Promise.resolve(errorResponse as Response))
      .mockReturnValueOnce(mockResponse("Success after retry"));

    const client = makeClient({ maxRetries: 2 });
    const result = await client.generateResponse("", "Hi");

    expect(result).toBe("Success after retry");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("retries on 503 up to maxRetries then throws", async () => {
    const errorResponse = {
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      text: () => Promise.resolve(""),
    };
    mockFetch.mockReturnValue(Promise.resolve(errorResponse as Response));

    const client = makeClient({ maxRetries: 1 });
    await expect(client.generateResponse("", "Hi")).rejects.toThrow("503");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("does not retry on 401", async () => {
    mockFetch.mockReturnValue(Promise.resolve({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: () => Promise.resolve("Bad key"),
    } as Response));

    const client = makeClient({ maxRetries: 3 });
    await expect(client.generateResponse("", "Hi")).rejects.toThrow("401");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("streams tokens via onToken callback", async () => {
    mockFetch.mockReturnValue(mockStreamResponse(["Hello", " world", "!"]));

    const tokens: string[] = [];
    const client = makeClient();
    const result = await client.generateResponse("", "Hi", (token) => tokens.push(token));

    expect(result).toBe("Hello world!");
    expect(tokens).toEqual(["Hello", " world", "!"]);
  });

  it("falls back when stream produces no content", async () => {
    mockFetch.mockReturnValue(mockStreamResponse([]));

    const client = makeClient();
    const result = await client.generateResponse("", "Hi");

    expect(result).toBe("No response generated.");
  });
});

describe("createLLMClient factory", () => {
  it("throws when real provider has no credentials", async () => {
    const { createLLMClient } = await import("../../src/llm/factory.js");
    expect(() => createLLMClient("openai-compatible", {
      provider: "openai-compatible",
      defaultSessionId: "default",
      databasePath: "data/yunluostar.db",
    })).toThrow("requires an API key");
  });

  it("returns deterministic client for deterministic provider", async () => {
    const { createLLMClient } = await import("../../src/llm/factory.js");
    const client = createLLMClient("deterministic");
    const result = await client.generateResponse("", "Hi");
    expect(result).toContain("Response to: Hi");
  });

  it("throws for unknown provider", async () => {
    const { createLLMClient } = await import("../../src/llm/factory.js");
    expect(() => createLLMClient("claude")).toThrow("Unknown provider");
  });
});
