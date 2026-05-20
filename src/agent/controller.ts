import type { LLMClient } from "../llm/client.js";
import type { DbClient } from "../db/connection.js";
import { getRawSqlite } from "../db/connection.js";
import { createEpisodesRepository } from "../db/episodes-repository.js";
import { createSemanticMemoriesRepository } from "../db/semantic-memories-repository.js";
import { createUserModelRepository } from "../db/user-model-repository.js";
import { createSelfModelRepository } from "../db/self-model-repository.js";
import { createReflectionsRepository } from "../db/reflections-repository.js";
import { createAuditLogRepository } from "../db/audit-log-repository.js";
import { createWorkingMemoryRepository } from "../db/working-memory-repository.js";
import type { EmbeddingClient } from "../llm/embedding-client.js";
import { createEmbeddingStore } from "../memory/embedding-store.js";
import { createCompositeScorer } from "../memory/composite-scorer.js";
import { recordEpisode } from "../memory/episodic/episode-recorder.js";
import { awakenMemories } from "../memory/memory-awakener.js";
import { buildCognitiveContext } from "../memory/context-builder.js";
import { reflectAndPersist } from "../metacognition/reflector.js";
import { consolidate } from "../memory/memory-consolidator.js";
import { applyCorrection } from "../memory/correction-handler.js";
import { createDefaultTrace, generateId } from "../models/defaults.js";
import type { ChatTrace } from "../models/schemas.js";
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

export function createAgentController(llm: LLMClient, db: DbClient, embeddingClient?: EmbeddingClient) {
  const episodesRepo = createEpisodesRepository(db);
  const semanticMemoriesRepo = createSemanticMemoriesRepository(db);
  const userModelRepo = createUserModelRepository(db);
  const selfModelRepo = createSelfModelRepository(db);
  const reflectionsRepo = createReflectionsRepository(db);
  const auditRepo = createAuditLogRepository(db);
  const wmRepo = createWorkingMemoryRepository(db);

  const embeddingStore = embeddingClient
    ? createEmbeddingStore(getRawSqlite(db))
    : undefined;
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
