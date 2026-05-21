import type { AppConfig } from "../config.js";
import { readAuthFile } from "../auth/token-store.js";
import {
  chatRequestSchema,
  runtimeEventSchema,
  runtimeListResponseSchema,
  runtimeStatusSchema,
  sessionStateSchema,
  type ChatRequest,
  type RuntimeEvent,
  type RuntimeListResponse,
  type RuntimeStatus,
  type SessionState,
  type ToolResult,
} from "../protocol/runtime.js";
import { toolResultSchema } from "../protocol/runtime.js";
import type { ChatResult, GoalTransition } from "../models/schemas.js";
import { goalTransitionSchema } from "../models/schemas.js";
import {
  botMessageRequestSchema,
  botMessageResponseSchema,
  type BotMessageRequest,
  type BotMessageResponse,
} from "../bot/protocol.js";
import { collectWorkspaceContext } from "./workspace-context.js";

export interface RuntimeChatOptions {
  onEvent?: (event: RuntimeEvent) => void | Promise<void>;
}

export interface RuntimeClient {
  status(): Promise<RuntimeStatus>;
  chat(request: ChatRequest, options?: RuntimeChatOptions): Promise<ChatResult>;
  sendBotMessage(request: BotMessageRequest): Promise<BotMessageResponse>;
  listMemory(limit?: number): Promise<RuntimeListResponse>;
  getMemory(id: string): Promise<Record<string, unknown> | null>;
  listGoals(filters?: { status?: string; type?: string }): Promise<RuntimeListResponse>;
  transitionGoal(transition: GoalTransition): Promise<{ success: boolean; reason?: string }>;
  listSelfModel(): Promise<RuntimeListResponse>;
  listReflections(limit?: number): Promise<RuntimeListResponse>;
  sendToolResult(result: ToolResult): Promise<void>;
  getSession(sessionId: string): Promise<SessionState>;
}

function requestHeaders(config: AppConfig): Record<string, string> {
  const auth = readAuthFile();
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (auth?.runtimeUrl === config.runtimeUrl) {
    headers.authorization = `Bearer ${auth.token}`;
  }
  return headers;
}

function responseError(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
    return payload.error;
  }
  return fallback;
}

async function readJsonResponse<T>(response: Response, parse: (value: unknown) => T): Promise<T> {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(responseError(payload, `Runtime request failed: ${response.status}`));
  }
  return parse(payload);
}

function parseSseChunk(buffer: string): { events: RuntimeEvent[]; remainder: string } {
  const events: RuntimeEvent[] = [];
  const blocks = buffer.split(/\r?\n\r?\n/);
  const remainder = blocks.pop() ?? "";
  for (const block of blocks) {
    const dataLine = block.split(/\r?\n/).find((line) => line.startsWith("data: "));
    if (!dataLine) continue;
    events.push(runtimeEventSchema.parse(JSON.parse(dataLine.slice("data: ".length))));
  }
  return { events, remainder };
}

class LazyEmbeddedRuntimeClient implements RuntimeClient {
  private clientPromise?: Promise<RuntimeClient>;

  constructor(private readonly config: AppConfig) {
  }

  private async client(): Promise<RuntimeClient> {
    this.clientPromise ??= import("./embedded-adapter.js")
      .then((module) => module.createEmbeddedRuntimeClient(this.config));
    return this.clientPromise;
  }

  async status(): Promise<RuntimeStatus> {
    return (await this.client()).status();
  }

  async chat(request: ChatRequest, options?: RuntimeChatOptions): Promise<ChatResult> {
    return (await this.client()).chat(chatRequestSchema.parse(request), options);
  }

  async sendBotMessage(request: BotMessageRequest): Promise<BotMessageResponse> {
    return (await this.client()).sendBotMessage(botMessageRequestSchema.parse(request));
  }

  async listMemory(limit?: number): Promise<RuntimeListResponse> {
    return (await this.client()).listMemory(limit);
  }

  async getMemory(id: string): Promise<Record<string, unknown> | null> {
    return (await this.client()).getMemory(id);
  }

  async listGoals(filters?: { status?: string; type?: string }): Promise<RuntimeListResponse> {
    return (await this.client()).listGoals(filters);
  }

  async transitionGoal(transition: GoalTransition): Promise<{ success: boolean; reason?: string }> {
    return (await this.client()).transitionGoal(goalTransitionSchema.parse(transition));
  }

  async listSelfModel(): Promise<RuntimeListResponse> {
    return (await this.client()).listSelfModel();
  }

  async listReflections(limit?: number): Promise<RuntimeListResponse> {
    return (await this.client()).listReflections(limit);
  }

  async sendToolResult(result: ToolResult): Promise<void> {
    await (await this.client()).sendToolResult(result);
  }

  async getSession(sessionId: string): Promise<SessionState> {
    return (await this.client()).getSession(sessionId);
  }
}

class HttpRuntimeClient implements RuntimeClient {
  constructor(private readonly config: AppConfig) {}

  async status(): Promise<RuntimeStatus> {
    const response = await fetch(new URL("/v1/runtime/status", this.config.runtimeUrl));
    return readJsonResponse(response, (payload) => runtimeStatusSchema.parse(payload));
  }

  async chat(request: ChatRequest, options?: RuntimeChatOptions): Promise<ChatResult> {
    const response = await fetch(new URL("/v1/chat", this.config.runtimeUrl), {
      method: "POST",
      headers: requestHeaders(this.config),
      body: JSON.stringify(chatRequestSchema.parse(request)),
    });
    if (!response.ok || !response.body) {
      const payload = await response.json().catch(() => undefined);
      throw new Error(responseError(payload, `Runtime chat failed: ${response.status}`));
    }

    const decoder = new TextDecoder();
    const reader = response.body.getReader();
    let buffer = "";
    let finalResult: ChatResult | undefined;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parsed = parseSseChunk(buffer);
      buffer = parsed.remainder;
      for (const event of parsed.events) {
        await options?.onEvent?.(event);
        if (event.type === "final") finalResult = event.result;
        if (event.type === "error") throw new Error(event.message);
      }
    }

    if (!finalResult) throw new Error("Runtime chat stream ended without a final event.");
    return finalResult;
  }

  async sendBotMessage(request: BotMessageRequest): Promise<BotMessageResponse> {
    const response = await fetch(new URL("/v1/bot/message", this.config.runtimeUrl), {
      method: "POST",
      headers: requestHeaders(this.config),
      body: JSON.stringify(botMessageRequestSchema.parse(request)),
    });
    return readJsonResponse(response, (payload) => botMessageResponseSchema.parse(payload));
  }

  async listMemory(limit?: number): Promise<RuntimeListResponse> {
    const url = new URL("/v1/memory", this.config.runtimeUrl);
    if (limit !== undefined) url.searchParams.set("limit", String(limit));
    url.searchParams.set("workspaceId", collectWorkspaceContext(this.config).workspaceId);
    const response = await fetch(url, {
      headers: requestHeaders(this.config),
    });
    return readJsonResponse(response, (payload) => runtimeListResponseSchema.parse(payload));
  }

  async getMemory(id: string): Promise<Record<string, unknown> | null> {
    const url = new URL(`/v1/memory/${encodeURIComponent(id)}`, this.config.runtimeUrl);
    url.searchParams.set("workspaceId", collectWorkspaceContext(this.config).workspaceId);
    const response = await fetch(url, {
      headers: requestHeaders(this.config),
    });
    if (response.status === 404) return null;
    return readJsonResponse(response, (payload) => payload as Record<string, unknown>);
  }

  async listGoals(filters: { status?: string; type?: string } = {}): Promise<RuntimeListResponse> {
    const url = new URL("/v1/goals", this.config.runtimeUrl);
    if (filters.status) url.searchParams.set("status", filters.status);
    if (filters.type) url.searchParams.set("type", filters.type);
    url.searchParams.set("workspaceId", collectWorkspaceContext(this.config).workspaceId);
    const response = await fetch(url, {
      headers: requestHeaders(this.config),
    });
    return readJsonResponse(response, (payload) => runtimeListResponseSchema.parse(payload));
  }

  async transitionGoal(transition: GoalTransition): Promise<{ success: boolean; reason?: string }> {
    const url = new URL("/v1/goals/transition", this.config.runtimeUrl);
    url.searchParams.set("workspaceId", collectWorkspaceContext(this.config).workspaceId);
    const response = await fetch(url, {
      method: "POST",
      headers: requestHeaders(this.config),
      body: JSON.stringify(goalTransitionSchema.parse(transition)),
    });
    return readJsonResponse(response, (payload) => payload as { success: boolean; reason?: string });
  }

  async listSelfModel(): Promise<RuntimeListResponse> {
    const url = new URL("/v1/self", this.config.runtimeUrl);
    url.searchParams.set("workspaceId", collectWorkspaceContext(this.config).workspaceId);
    const response = await fetch(url, {
      headers: requestHeaders(this.config),
    });
    return readJsonResponse(response, (payload) => runtimeListResponseSchema.parse(payload));
  }

  async listReflections(limit?: number): Promise<RuntimeListResponse> {
    const url = new URL("/v1/reflections", this.config.runtimeUrl);
    if (limit !== undefined) url.searchParams.set("limit", String(limit));
    url.searchParams.set("workspaceId", collectWorkspaceContext(this.config).workspaceId);
    const response = await fetch(url, {
      headers: requestHeaders(this.config),
    });
    return readJsonResponse(response, (payload) => runtimeListResponseSchema.parse(payload));
  }

  async sendToolResult(result: ToolResult): Promise<void> {
    const url = new URL("/v1/tools/result", this.config.runtimeUrl);
    url.searchParams.set("workspaceId", collectWorkspaceContext(this.config).workspaceId);
    const response = await fetch(url, {
      method: "POST",
      headers: requestHeaders(this.config),
      body: JSON.stringify(toolResultSchema.parse(result)),
    });
    await readJsonResponse(response, () => undefined);
  }

  async getSession(sessionId: string): Promise<SessionState> {
    const url = new URL(`/v1/session/${encodeURIComponent(sessionId)}`, this.config.runtimeUrl);
    url.searchParams.set("workspaceId", collectWorkspaceContext(this.config).workspaceId);
    const response = await fetch(url, {
      headers: requestHeaders(this.config),
    });
    return readJsonResponse(response, (payload) => sessionStateSchema.parse(payload));
  }
}

export function createRuntimeClient(config: AppConfig): RuntimeClient {
  if (config.runtimeMode === "embedded") return new LazyEmbeddedRuntimeClient(config);
  return new HttpRuntimeClient(config);
}
