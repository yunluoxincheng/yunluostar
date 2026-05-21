import type { LLMClient } from "../llm/client.js";
import type { DbClient } from "../db/connection.js";
import { createEpisodesRepository } from "../db/episodes-repository.js";
import { createSemanticMemoriesRepository } from "../db/semantic-memories-repository.js";
import { createUserModelRepository } from "../db/user-model-repository.js";
import { createSelfModelRepository } from "../db/self-model-repository.js";
import { createReflectionsRepository } from "../db/reflections-repository.js";
import { createAuditLogRepository } from "../db/audit-log-repository.js";
import { createWorkingMemoryRepository } from "../db/working-memory-repository.js";
import { createGoalsRepository } from "../db/goals-repository.js";
import type { EmbeddingClient } from "../llm/embedding-client.js";
import type { EmbeddingStore } from "../memory/embedding-store.js";
import { createCompositeScorer } from "../memory/composite-scorer.js";
import { recordEpisode } from "../memory/episodic/episode-recorder.js";
import { awakenMemories } from "../memory/memory-awakener.js";
import { buildCognitiveContext } from "../memory/context-builder.js";
import { reflectAndPersist } from "../metacognition/reflector.js";
import { consolidate } from "../memory/memory-consolidator.js";
import { applyCorrection } from "../memory/correction-handler.js";
import { createGoalManager } from "../planning/goal-manager.js";
import { detectAndPersistConflicts } from "../planning/conflict-detector.js";
import { createDefaultTrace, generateId } from "../models/defaults.js";
import type { ChatTrace } from "../models/schemas.js";
import type { DataScope } from "../db/scope.js";
import {
  createDefaultWorkingMemory,
  mergeWorkingMemoryUpdate,
  serializeWorkingMemory,
  deserializeWorkingMemory,
} from "../models/working-memory.js";

export interface AgentConfig {
  sessionId: string;
  onToken?: (token: string) => void;
  onStage?: (stage: PipelineStage) => void;
}

export type PipelineStage =
  | "restoring"
  | "awakening"
  | "thinking"
  | "recording"
  | "reflecting"
  | "consolidating"
  | "correcting"
  | "saving"
  | "done";

export interface AgentResult {
  response: string;
  trace: ChatTrace;
}

export interface AgentControllerOptions {
  embeddingClient?: EmbeddingClient;
  embeddingStore?: EmbeddingStore;
  scope?: DataScope;
}

function normalizeOptions(options?: EmbeddingClient | AgentControllerOptions, scope?: DataScope): AgentControllerOptions {
  if (!options) return { scope };
  if ("embed" in options && "embedBatch" in options) {
    return { embeddingClient: options, scope };
  }
  return { ...options, scope: options.scope ?? scope };
}

export function createAgentController(
  llm: LLMClient,
  db: DbClient,
  options?: EmbeddingClient | AgentControllerOptions,
  scope?: DataScope,
) {
  const agentOptions = normalizeOptions(options, scope);
  const episodesRepo = createEpisodesRepository(db, agentOptions.scope);
  const semanticMemoriesRepo = createSemanticMemoriesRepository(db, agentOptions.scope);
  const userModelRepo = createUserModelRepository(db, agentOptions.scope);
  const selfModelRepo = createSelfModelRepository(db, agentOptions.scope);
  const reflectionsRepo = createReflectionsRepository(db, agentOptions.scope);
  const auditRepo = createAuditLogRepository(db, agentOptions.scope);
  const wmRepo = createWorkingMemoryRepository(db, agentOptions.scope);
  const goalsRepo = createGoalsRepository(db, agentOptions.scope);

  const goalManager = createGoalManager(goalsRepo, auditRepo);

  const embeddingClient = agentOptions.embeddingClient;
  const embeddingStore = agentOptions.embeddingStore;
  const scorer = embeddingClient && embeddingStore
    ? createCompositeScorer(embeddingClient, embeddingStore)
    : undefined;

  return {
    async chat(userInput: string, config: AgentConfig): Promise<AgentResult> {
      const { onStage } = config;

      onStage?.("restoring");
      const latestSnapshot = wmRepo.findLatestBySession(config.sessionId);
      let wm = latestSnapshot
        ? deserializeWorkingMemory(latestSnapshot.snapshot)
        : createDefaultWorkingMemory();

      onStage?.("awakening");
      const awakened = await awakenMemories(
        userInput,
        semanticMemoriesRepo,
        userModelRepo,
        selfModelRepo,
        scorer ?? { score: () => [] },
      );

      // Select current goal and inject into working memory BEFORE building context
      const currentGoal = goalManager.selectCurrentGoal();
      if (currentGoal) {
        wm = mergeWorkingMemoryUpdate(wm, {
          currentGoal: currentGoal.description,
        });
      }

      const cognitiveContext = buildCognitiveContext(awakened, wm);

      onStage?.("thinking");
      const response = await llm.generateResponse(cognitiveContext, userInput, config.onToken);

      onStage?.("recording");
      const { episodeId, extraction } = await recordEpisode(llm, episodesRepo, auditRepo, {
        sessionId: config.sessionId,
        userInput,
        agentResponse: response,
      });

      const trace = createDefaultTrace(episodeId);
      if (latestSnapshot) trace.restoredSnapshotId = latestSnapshot.id;
      if (currentGoal) trace.selectedGoalId = currentGoal.id;
      trace.recalledMemoryIds = awakened.recalledMemories.map((m) => m.id);
      trace.appliedUserModelIds = awakened.userModelEntries.map((e) => e.id);
      trace.appliedSelfModelIds = awakened.selfModelEntries.map((e) => e.id);

      onStage?.("reflecting");
      const { reflectionId, reflection: reflectionOutput } = await reflectAndPersist(llm, reflectionsRepo, auditRepo, {
        episodeId,
        userInput,
        agentResponse: response,
        context: cognitiveContext,
        extraction,
      });
      trace.reflectionId = reflectionId;

      if (reflectionOutput.workingMemoryUpdate) {
        const u = reflectionOutput.workingMemoryUpdate;
        wm = mergeWorkingMemoryUpdate(wm, {
          currentGoal: u.current_goal,
          currentContext: u.current_context,
          activeHypotheses: u.active_hypotheses,
          openQuestions: u.open_questions,
          riskFlags: u.risk_flags,
        });
      }

      onStage?.("consolidating");
      const consolidationResult = await consolidate(llm, semanticMemoriesRepo, userModelRepo, selfModelRepo, auditRepo, {
        episodeId,
        extraction,
        reflectionOutput,
      }, embeddingClient, embeddingStore);

      // Create suggested goals from consolidation evidence
      const suggestedGoalIds: string[] = [];
      if (consolidationResult.selfModelIds.length > 0 || consolidationResult.userModelIds.length > 0) {
        // Create a durable suggested goal requiring approval
        const durableResult = goalManager.suggestGoal({
          description: extraction.outcome ?? `Interaction goal: ${extraction.intent}`,
          type: "medium_term",
          sourceEpisodeId: episodeId,
          evidence: extraction.lesson ?? undefined,
          rationale: "Derived from consolidation output",
        });
        if (durableResult.created) {
          suggestedGoalIds.push(durableResult.id);
        }

        // Also create a local operational goal for the current loop
        const opsResult = goalManager.suggestGoal({
          description: `Operational: ${extraction.intent}`,
          type: "operational",
          sourceEpisodeId: episodeId,
          rationale: "Local operational goal for current cognitive loop",
        });
        if (opsResult.created) {
          suggestedGoalIds.push(opsResult.id);
        }
      }
      trace.suggestedGoalIds = suggestedGoalIds;

      onStage?.("correcting");
      for (const newId of consolidationResult.userModelIds) {
        const newEntry = userModelRepo.findById(newId);
        if (!newEntry) continue;
        const existing = userModelRepo.findByKey(newEntry.key);
        const older = existing.filter((e) => e.id !== newId && e.status === "active");
        for (const old of older) {
          await applyCorrection(
            semanticMemoriesRepo, userModelRepo, selfModelRepo, auditRepo,
            { table: "user_model", oldId: old.id, newId, reason: `Superseded by newer entry for key "${newEntry.key}"` },
          );
        }
      }

      for (const newId of consolidationResult.selfModelIds) {
        const newEntry = selfModelRepo.findById(newId);
        if (!newEntry) continue;
        const existing = selfModelRepo.findByTrait(newEntry.trait);
        const older = existing.filter((e) => e.id !== newId && e.status === "active");
        for (const old of older) {
          await applyCorrection(
            semanticMemoriesRepo, userModelRepo, selfModelRepo, auditRepo,
            { table: "self_model", oldId: old.id, newId, reason: `Superseded by newer entry for trait "${newEntry.trait}"` },
          );
        }
      }

      onStage?.("saving");
      const snapshotId = generateId();
      wmRepo.save({
        id: snapshotId,
        sessionId: config.sessionId,
        snapshot: serializeWorkingMemory(wm),
        episodeId,
        createdAt: new Date(),
      });
      trace.savedSnapshotId = snapshotId;

      onStage?.("done");
      return { response, trace };
    },
  };
}

export type AgentController = ReturnType<typeof createAgentController>;
