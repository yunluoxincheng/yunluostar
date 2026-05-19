import type { LLMClient } from "../../llm/client.js";
import type { EpisodesRepository } from "../../db/episodes-repository.js";
import type { AuditLogRepository } from "../../db/audit-log-repository.js";
import { generateId, FALLBACK_LESSON, FALLBACK_INTENT, FALLBACK_ACTION, FALLBACK_OUTCOME, DEFAULT_IMPORTANCE, DEFAULT_CONFIDENCE } from "../../models/defaults.js";
import { safeExtraction } from "../../llm/factory.js";

export interface RecordEpisodeInput {
  sessionId: string;
  userInput: string;
  agentResponse: string;
}

export async function recordEpisode(
  llm: LLMClient,
  episodesRepo: EpisodesRepository,
  auditRepo: AuditLogRepository,
  input: RecordEpisodeInput,
): Promise<{ episodeId: string; extraction: ReturnType<typeof safeExtraction> }> {
  const rawExtraction = await llm.extractEpisode(input.userInput, input.agentResponse);
  const extraction = safeExtraction(rawExtraction);

  const id = generateId();
  const episode = {
    id,
    sessionId: input.sessionId,
    timestamp: new Date(),
    userInput: input.userInput,
    agentResponse: input.agentResponse,
    intent: extraction.intent,
    action: extraction.action,
    outcome: extraction.outcome,
    lesson: extraction.lesson,
    importance: extraction.importance,
    confidence: extraction.confidence,
    status: "active" as const,
    supersededBy: null,
    createdAt: new Date(),
  };

  episodesRepo.insert(episode);
  auditRepo.insert({
    id: generateId(),
    targetTable: "episodes",
    targetId: id,
    action: "create",
    beforeValue: null,
    afterValue: JSON.stringify({ intent: extraction.intent, lesson: extraction.lesson }),
    reason: "Episode recorded after chat interaction",
    timestamp: new Date(),
  });

  return { episodeId: id, extraction };
}
