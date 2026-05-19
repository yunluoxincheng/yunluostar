import type { SemanticMemoriesRepository } from "../db/semantic-memories-repository.js";
import type { UserModelRepository } from "../db/user-model-repository.js";
import type { SelfModelRepository } from "../db/self-model-repository.js";
import type { RelevanceScorer } from "./relevance-scorer.js";
import { MIN_CONFIDENCE_FOR_INFLUENCE } from "../models/defaults.js";

export interface AwakenedContext {
  recalledMemories: Array<{ id: string; content: string; confidence: number }>;
  userModelEntries: Array<{ id: string; key: string; value: string; confidence: number }>;
  selfModelEntries: Array<{ id: string; trait: string; value: string; confidence: number }>;
}

export async function awakenMemories(
  userInput: string,
  semanticMemoriesRepo: SemanticMemoriesRepository,
  userModelRepo: UserModelRepository,
  selfModelRepo: SelfModelRepository,
  scorer: RelevanceScorer,
): Promise<AwakenedContext> {
  const allMemories = semanticMemoriesRepo.findActiveByConfidence(MIN_CONFIDENCE_FOR_INFLUENCE);

  const candidates = allMemories.map((m) => ({ id: m.id, content: m.content }));
  const scored = scorer.score(userInput, candidates);

  const recalledMemories = scored
    .filter((s) => s.score > 0)
    .slice(0, 5)
    .map((s) => {
      const mem = allMemories.find((m) => m.id === s.id)!;
      return { id: mem.id, content: mem.content, confidence: mem.confidence };
    });

  const userModelEntries = userModelRepo
    .findActiveByConfidence(MIN_CONFIDENCE_FOR_INFLUENCE)
    .map((e) => ({ id: e.id, key: e.key, value: e.value, confidence: e.confidence }));

  const selfModelEntries = selfModelRepo
    .findActive()
    .filter((e) => e.confidence > MIN_CONFIDENCE_FOR_INFLUENCE)
    .map((e) => ({ id: e.id, trait: e.trait, value: e.value, confidence: e.confidence }));

  return { recalledMemories, userModelEntries, selfModelEntries };
}
