import type { LLMClient } from "../llm/client.js";
import type { ReflectionsRepository } from "../db/reflections-repository.js";
import type { AuditLogRepository } from "../db/audit-log-repository.js";
import type { EpisodeExtraction } from "../llm/client.js";
import { generateId } from "../models/defaults.js";
import { safeReflection } from "../llm/factory.js";

export interface ReflectInput {
  episodeId: string;
  userInput: string;
  agentResponse: string;
  context: string;
  extraction: EpisodeExtraction;
}

export async function reflectAndPersist(
  llm: LLMClient,
  reflectionsRepo: ReflectionsRepository,
  auditRepo: AuditLogRepository,
  input: ReflectInput,
): Promise<{ reflectionId: string; reflection: ReturnType<typeof safeReflection> }> {
  const rawReflection = await llm.reflect(input.userInput, input.agentResponse, input.context);
  const reflection = safeReflection(rawReflection);

  const id = generateId();
  reflectionsRepo.insert({
    id,
    episodeId: input.episodeId,
    whatWorked: reflection.whatWorked,
    whatFailed: reflection.whatFailed,
    lessons: reflection.lessons,
    updateCandidates: reflection.updateCandidates,
    createdAt: new Date(),
  });

  auditRepo.insert({
    id: generateId(),
    targetTable: "reflections",
    targetId: id,
    action: "create",
    beforeValue: null,
    afterValue: JSON.stringify({ lessons: reflection.lessons }),
    reason: "Reflection persisted after chat interaction",
    timestamp: new Date(),
  });

  return { reflectionId: id, reflection };
}
