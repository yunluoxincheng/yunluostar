import type { LLMClient } from "../llm/client.js";
import type { DbClient } from "../db/connection.js";
import { createEpisodesRepository } from "../db/episodes-repository.js";
import { createSemanticMemoriesRepository } from "../db/semantic-memories-repository.js";
import { createUserModelRepository } from "../db/user-model-repository.js";
import { createSelfModelRepository } from "../db/self-model-repository.js";
import { createReflectionsRepository } from "../db/reflections-repository.js";
import { createAuditLogRepository } from "../db/audit-log-repository.js";
import { createLexicalScorer } from "../memory/relevance-scorer.js";
import { recordEpisode } from "../memory/episodic/episode-recorder.js";
import { awakenMemories } from "../memory/memory-awakener.js";
import { buildCognitiveContext } from "../memory/context-builder.js";
import { reflectAndPersist } from "../metacognition/reflector.js";
import { consolidate } from "../memory/memory-consolidator.js";
import { applyCorrection } from "../memory/correction-handler.js";
import { createDefaultTrace } from "../models/defaults.js";
import type { ChatTrace } from "../models/schemas.js";

export interface AgentConfig {
  sessionId: string;
}

export interface AgentResult {
  response: string;
  trace: ChatTrace;
}

export function createAgentController(llm: LLMClient, db: DbClient) {
  const episodesRepo = createEpisodesRepository(db);
  const semanticMemoriesRepo = createSemanticMemoriesRepository(db);
  const userModelRepo = createUserModelRepository(db);
  const selfModelRepo = createSelfModelRepository(db);
  const reflectionsRepo = createReflectionsRepository(db);
  const auditRepo = createAuditLogRepository(db);
  const scorer = createLexicalScorer();

  return {
    async chat(userInput: string, config: AgentConfig): Promise<AgentResult> {
      const awakened = await awakenMemories(
        userInput,
        semanticMemoriesRepo,
        userModelRepo,
        selfModelRepo,
        scorer,
      );

      const cognitiveContext = buildCognitiveContext(awakened);
      const response = await llm.generateResponse(cognitiveContext, userInput);

      const { episodeId, extraction } = await recordEpisode(llm, episodesRepo, auditRepo, {
        sessionId: config.sessionId,
        userInput,
        agentResponse: response,
      });

      const trace = createDefaultTrace(episodeId);
      trace.recalledMemoryIds = awakened.recalledMemories.map((m) => m.id);
      trace.appliedUserModelIds = awakened.userModelEntries.map((e) => e.id);
      trace.appliedSelfModelIds = awakened.selfModelEntries.map((e) => e.id);

      const { reflectionId, reflection: reflectionOutput } = await reflectAndPersist(llm, reflectionsRepo, auditRepo, {
        episodeId,
        userInput,
        agentResponse: response,
        context: cognitiveContext,
        extraction,
      });
      trace.reflectionId = reflectionId;

      const consolidationResult = await consolidate(llm, semanticMemoriesRepo, userModelRepo, selfModelRepo, auditRepo, {
        episodeId,
        extraction,
        reflectionOutput,
      });

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

      return { response, trace };
    },
  };
}

export type AgentController = ReturnType<typeof createAgentController>;
