import type { AppConfig } from "../config.js";
import type { ChatResult, GoalTransition } from "../models/schemas.js";
import { goalTransitionSchema } from "../models/schemas.js";
import { chatRequestSchema, type ChatRequest, type RuntimeListResponse, type RuntimeStatus, type SessionState, type ToolResult } from "../protocol/runtime.js";
import { botMessageRequestSchema, type BotMessageRequest, type BotMessageResponse } from "../bot/protocol.js";
import { createLocalAgentRuntime } from "../runtime/local-agent-runtime.js";
import { collectWorkspaceContext } from "./workspace-context.js";
import type { RuntimeChatOptions, RuntimeClient } from "./client.js";

class EmbeddedRuntimeClient implements RuntimeClient {
  private runtime;

  constructor(private readonly config: AppConfig) {
    this.runtime = createLocalAgentRuntime(config);
  }

  status(): Promise<RuntimeStatus> {
    return this.runtime.status();
  }

  chat(request: ChatRequest, options?: RuntimeChatOptions): Promise<ChatResult> {
    return this.runtime.chat(chatRequestSchema.parse(request), { onEvent: options?.onEvent });
  }

  sendBotMessage(request: BotMessageRequest): Promise<BotMessageResponse> {
    return this.runtime.handleBotMessage(botMessageRequestSchema.parse(request));
  }

  listMemory(limit?: number): Promise<RuntimeListResponse> {
    return this.runtime.listMemory(limit, collectWorkspaceContext(this.config).workspaceId);
  }

  getMemory(id: string): Promise<Record<string, unknown> | null> {
    return this.runtime.getMemory(id, collectWorkspaceContext(this.config).workspaceId);
  }

  listGoals(filters?: { status?: string; type?: string }): Promise<RuntimeListResponse> {
    return this.runtime.listGoals({ ...filters, workspaceId: collectWorkspaceContext(this.config).workspaceId });
  }

  transitionGoal(transition: GoalTransition): Promise<{ success: boolean; reason?: string }> {
    return this.runtime.transitionGoal(goalTransitionSchema.parse(transition), collectWorkspaceContext(this.config).workspaceId);
  }

  listSelfModel(): Promise<RuntimeListResponse> {
    return this.runtime.listSelfModel(collectWorkspaceContext(this.config).workspaceId);
  }

  listReflections(limit?: number): Promise<RuntimeListResponse> {
    return this.runtime.listReflections(limit, collectWorkspaceContext(this.config).workspaceId);
  }

  async sendToolResult(result: ToolResult): Promise<void> {
    await this.runtime.receiveToolResult(result, collectWorkspaceContext(this.config).workspaceId);
  }

  getSession(sessionId: string): Promise<SessionState> {
    return this.runtime.getSession(sessionId, collectWorkspaceContext(this.config).workspaceId);
  }
}

export function createEmbeddedRuntimeClient(config: AppConfig): RuntimeClient {
  return new EmbeddedRuntimeClient(config);
}
