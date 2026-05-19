import type { LLMClient, EpisodeExtraction, ReflectionOutput } from "../llm/client.js";
import type { SemanticMemoriesRepository } from "../db/semantic-memories-repository.js";
import type { UserModelRepository } from "../db/user-model-repository.js";
import type { SelfModelRepository } from "../db/self-model-repository.js";
import type { AuditLogRepository } from "../db/audit-log-repository.js";
import { generateId } from "../models/defaults.js";
import { safeConsolidation } from "../llm/factory.js";

export interface ConsolidateInput {
  episodeId: string;
  extraction: EpisodeExtraction;
  reflectionOutput: ReflectionOutput;
}

export interface ConsolidateResult {
  semanticMemoryIds: string[];
  userModelIds: string[];
  selfModelIds: string[];
}

export async function consolidate(
  llm: LLMClient,
  semanticMemoriesRepo: SemanticMemoriesRepository,
  userModelRepo: UserModelRepository,
  selfModelRepo: SelfModelRepository,
  auditRepo: AuditLogRepository,
  input: ConsolidateInput,
): Promise<ConsolidateResult> {
  const rawConsolidation = await llm.consolidate(input.extraction, input.reflectionOutput);
  const consolidation = safeConsolidation(rawConsolidation);

  const semanticMemoryIds: string[] = [];
  const userModelIds: string[] = [];
  const selfModelIds: string[] = [];

  for (const mem of consolidation.semanticMemories) {
    const id = generateId();
    semanticMemoriesRepo.insert({
      id,
      sourceEpisodeId: input.episodeId,
      content: mem.content,
      category: mem.category,
      importance: mem.importance,
      confidence: mem.confidence,
      status: "active",
      supersededBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    auditRepo.insert({
      id: generateId(),
      targetTable: "semantic_memories",
      targetId: id,
      action: "create",
      beforeValue: null,
      afterValue: JSON.stringify({ content: mem.content, confidence: mem.confidence }),
      reason: "Semantic memory created from consolidation",
      timestamp: new Date(),
    });
    semanticMemoryIds.push(id);
  }

  for (const update of consolidation.userModelUpdates) {
    const id = generateId();
    userModelRepo.insert({
      id,
      key: update.key,
      value: update.value,
      evidence: update.evidence,
      confidence: update.confidence,
      status: "active",
      supersededBy: null,
      sourceEpisodeId: input.episodeId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    auditRepo.insert({
      id: generateId(),
      targetTable: "user_model",
      targetId: id,
      action: "create",
      beforeValue: null,
      afterValue: JSON.stringify({ key: update.key, value: update.value, confidence: update.confidence }),
      reason: "User model entry created from consolidation",
      timestamp: new Date(),
    });
    userModelIds.push(id);
  }

  for (const update of consolidation.selfModelUpdates) {
    const id = generateId();
    selfModelRepo.insert({
      id,
      trait: update.trait,
      value: update.value,
      evidence: update.evidence,
      confidence: update.confidence,
      mutable: update.mutable,
      status: "active",
      supersededBy: null,
      sourceEpisodeId: input.episodeId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    auditRepo.insert({
      id: generateId(),
      targetTable: "self_model",
      targetId: id,
      action: "create",
      beforeValue: null,
      afterValue: JSON.stringify({ trait: update.trait, value: update.value, confidence: update.confidence }),
      reason: "Self model entry created from consolidation",
      timestamp: new Date(),
    });
    selfModelIds.push(id);
  }

  return { semanticMemoryIds, userModelIds, selfModelIds };
}
