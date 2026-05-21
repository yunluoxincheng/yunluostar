import type { AppConfig } from "../config.js";
import { getResolvedApiKey } from "../config.js";
import { createSemanticMemoriesRepository } from "../db/semantic-memories-repository.js";
import { createGoalsRepository } from "../db/goals-repository.js";
import { createWorkingMemoryRepository } from "../db/working-memory-repository.js";
import { createSelfModelRepository } from "../db/self-model-repository.js";
import { createReflectionsRepository } from "../db/reflections-repository.js";
import { createAuditLogRepository } from "../db/audit-log-repository.js";
import { createGoalManager } from "../planning/goal-manager.js";
import { createLLMClient } from "../llm/factory.js";
import { createAgentController } from "../agent/controller.js";
import { generateId } from "../models/defaults.js";
import { deserializeWorkingMemory } from "../models/working-memory.js";
import { createRuntimeEmbeddingClient } from "./embedding.js";
import { planToolRequest } from "./tool-request-planner.js";
import { scopeFromChatRequest, scopeFromWorkspace } from "./scope.js";
import { createSqliteRuntimeStorage } from "./storage.js";
import { createSqliteRuntimeVectorStore } from "./vector-store.js";
import type { ChatResult } from "../models/schemas.js";
import type { GoalTransition } from "../models/schemas.js";
import type {
  ChatRequest,
  PipelineStage,
  RuntimeEvent,
  RuntimeListResponse,
  RuntimeStatus,
  SessionState,
  ToolResult,
} from "../protocol/runtime.js";

export interface RuntimeChatHandlers {
  onEvent?: (event: RuntimeEvent) => void | Promise<void>;
  signal?: AbortSignal;
}

export interface AgentRuntime {
  status(): Promise<RuntimeStatus>;
  chat(request: ChatRequest, handlers?: RuntimeChatHandlers, userId?: string): Promise<ChatResult>;
  listMemory(limit?: number, workspaceId?: string, userId?: string): Promise<RuntimeListResponse>;
  getMemory(id: string, workspaceId?: string, userId?: string): Promise<Record<string, unknown> | null>;
  listGoals(filters?: { status?: string; type?: string; workspaceId?: string; userId?: string }): Promise<RuntimeListResponse>;
  transitionGoal(transition: GoalTransition, workspaceId?: string, userId?: string): Promise<{ success: boolean; reason?: string }>;
  listSelfModel(workspaceId?: string, userId?: string): Promise<RuntimeListResponse>;
  listReflections(limit?: number, workspaceId?: string, userId?: string): Promise<RuntimeListResponse>;
  getSession(sessionId: string, workspaceId?: string, userId?: string): Promise<SessionState>;
  receiveToolResult(result: ToolResult, workspaceId?: string, userId?: string): Promise<void>;
}

function providerReady(config: AppConfig): boolean {
  if (config.provider === "deterministic") return true;
  return !!(config.baseUrl && config.model && getResolvedApiKey(config));
}

function toolResultKey(requestId: string, toolRequestId: string): string {
  return `${requestId}:${toolRequestId}`;
}

function summarizeToolResult(result: ToolResult): string {
  const detail = result.output ?? result.error ?? "";
  return `Tool ${result.toolRequestId} completed with status ${result.status}. ${detail.slice(0, 1_000)}`.trim();
}

export function createLocalAgentRuntime(config: AppConfig): AgentRuntime {
  const storage = createSqliteRuntimeStorage(config);
  const pendingToolResults = new Map<string, (result: ToolResult) => void>();

  function waitForToolResult(requestId: string, toolRequestId: string, signal?: AbortSignal): Promise<ToolResult> {
    return new Promise((resolve, reject) => {
      const key = toolResultKey(requestId, toolRequestId);
      if (signal?.aborted) {
        reject(new Error("Tool request was aborted before a result was returned."));
        return;
      }
      const abort = () => {
        pendingToolResults.delete(key);
        reject(new Error("Tool request was aborted before a result was returned."));
      };
      signal?.addEventListener("abort", abort, { once: true });
      pendingToolResults.set(key, (result) => {
        signal?.removeEventListener("abort", abort);
        pendingToolResults.delete(key);
        resolve(result);
      });
    });
  }

  return {
    async status(): Promise<RuntimeStatus> {
      return {
        ok: true,
        mode: config.runtimeMode,
        version: "0.1.0",
        provider: config.provider,
        providerReady: providerReady(config),
        embeddingReady: true,
        authRequired: config.runtimeAuthRequired,
        storage: {
          driver: storage.driver,
          ownedByRuntime: true,
        },
      };
    },

    async chat(request: ChatRequest, handlers?: RuntimeChatHandlers, userId?: string): Promise<ChatResult> {
      return storage.withDb(async (db) => {
        const toolRequest = planToolRequest(request.input);
        let effectiveInput = request.input;
        if (toolRequest) {
          const waitForResult = waitForToolResult(request.requestId, toolRequest.id, handlers?.signal);
          await handlers?.onEvent?.({ type: "tool_request", requestId: request.requestId, toolRequest });
          const toolResult = await waitForResult;
          effectiveInput = `${request.input}\n\nRuntime local tool result:\n${summarizeToolResult(toolResult)}`;
        }
        const llm = createLLMClient(config.provider, config);
        const embeddingClient = createRuntimeEmbeddingClient();
        const vectorStore = createSqliteRuntimeVectorStore(db);
        const agent = createAgentController(llm, db, {
          embeddingClient,
          embeddingStore: vectorStore.store,
          scope: scopeFromChatRequest(request, userId),
        });
        const result = await agent.chat(effectiveInput, {
          sessionId: request.sessionId,
          onToken: (token: string) => handlers?.onEvent?.({ type: "token", requestId: request.requestId, token }),
          onStage: (stage: PipelineStage) => handlers?.onEvent?.({ type: "stage", requestId: request.requestId, stage }),
        });
        handlers?.onEvent?.({ type: "final", requestId: request.requestId, result });
        return result;
      }).catch(async (error) => {
        await handlers?.onEvent?.({
          type: "error",
          requestId: request.requestId,
          code: "runtime_error",
          message: (error as Error).message,
        });
        throw error;
      });
    },

    async listMemory(limit = 20, workspaceId?: string, userId?: string): Promise<RuntimeListResponse> {
      return storage.withDb((db) => {
        const repo = createSemanticMemoriesRepository(db, scopeFromWorkspace(workspaceId, userId));
        const items = repo.findRecent(limit).map((item) => ({ ...item }));
        return { items, total: items.length };
      });
    },

    async getMemory(id: string, workspaceId?: string, userId?: string): Promise<Record<string, unknown> | null> {
      return storage.withDb((db) => {
        const repo = createSemanticMemoriesRepository(db, scopeFromWorkspace(workspaceId, userId));
        const item = repo.findById(id);
        return item ? { ...item } : null;
      });
    },

    async listGoals(filters: { status?: string; type?: string; workspaceId?: string; userId?: string } = {}): Promise<RuntimeListResponse> {
      return storage.withDb((db) => {
        const repo = createGoalsRepository(db, scopeFromWorkspace(filters.workspaceId, filters.userId));
        let items = repo.findAll();
        if (filters.status) items = items.filter((goal) => goal.status === filters.status);
        if (filters.type) items = items.filter((goal) => goal.type === filters.type);
        const mapped = items.map((item) => ({ ...item }));
        return { items: mapped, total: mapped.length };
      });
    },

    async transitionGoal(transition: GoalTransition, workspaceId?: string, userId?: string): Promise<{ success: boolean; reason?: string }> {
      return storage.withDb((db) => {
        const scope = scopeFromWorkspace(workspaceId, userId);
        const goalsRepo = createGoalsRepository(db, scope);
        const auditRepo = createAuditLogRepository(db, scope);
        const goalManager = createGoalManager(goalsRepo, auditRepo);
        return goalManager.transitionGoal(transition.goalId, transition.action);
      });
    },

    async listSelfModel(workspaceId?: string, userId?: string): Promise<RuntimeListResponse> {
      return storage.withDb((db) => {
        const repo = createSelfModelRepository(db, scopeFromWorkspace(workspaceId, userId));
        const items = repo.findActive().map((item) => ({ ...item }));
        return { items, total: items.length };
      });
    },

    async listReflections(limit = 20, workspaceId?: string, userId?: string): Promise<RuntimeListResponse> {
      return storage.withDb((db) => {
        const repo = createReflectionsRepository(db, scopeFromWorkspace(workspaceId, userId));
        const items = repo.findRecent(limit).map((item) => ({ ...item }));
        return { items, total: items.length };
      });
    },

    async getSession(sessionId: string, workspaceId?: string, userId?: string): Promise<SessionState> {
      return storage.withDb((db) => {
        const repo = createWorkingMemoryRepository(db, scopeFromWorkspace(workspaceId, userId));
        const latest = repo.findLatestBySession(sessionId);
        return {
          sessionId,
          workingMemory: latest ? deserializeWorkingMemory(latest.snapshot) as unknown as Record<string, unknown> : undefined,
        };
      });
    },

    async receiveToolResult(result: ToolResult, workspaceId?: string, userId?: string): Promise<void> {
      pendingToolResults.get(toolResultKey(result.requestId, result.toolRequestId))?.(result);
      await storage.withDb((db) => {
        const scope = scopeFromWorkspace(workspaceId, userId);
        const auditRepo = createAuditLogRepository(db, scope);
        const semanticRepo = createSemanticMemoriesRepository(db, scope);
        auditRepo.insert({
          id: generateId(),
          targetTable: "local_tool_results",
          targetId: result.toolRequestId,
          action: "create",
          afterValue: JSON.stringify({
            requestId: result.requestId,
            status: result.status,
            output: result.output,
            error: result.error,
          }),
          reason: "CLI returned local tool execution result to runtime.",
          timestamp: new Date(),
        });
        semanticRepo.insert({
          id: generateId(),
          content: `Local tool ${result.toolRequestId} returned ${result.status}. ${result.error ? `Error: ${result.error}` : ""}${result.output ? ` Output: ${result.output.slice(0, 500)}` : ""}`.trim(),
          category: "tool_result",
          importance: result.status === "failed" ? 0.7 : 0.5,
          confidence: 1,
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
    },
  };
}
