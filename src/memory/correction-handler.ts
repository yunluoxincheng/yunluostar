import type { SemanticMemoriesRepository } from "../db/semantic-memories-repository.js";
import type { UserModelRepository } from "../db/user-model-repository.js";
import type { SelfModelRepository } from "../db/self-model-repository.js";
import type { AuditLogRepository } from "../db/audit-log-repository.js";
import { generateId } from "../models/defaults.js";

export interface CorrectionInput {
  table: "semantic_memories" | "user_model" | "self_model";
  oldId: string;
  newId: string;
  reason: string;
}

export async function applyCorrection(
  semanticMemoriesRepo: SemanticMemoriesRepository,
  userModelRepo: UserModelRepository,
  selfModelRepo: SelfModelRepository,
  auditRepo: AuditLogRepository,
  correction: CorrectionInput,
): Promise<void> {
  const { table, oldId, newId, reason } = correction;

  let beforeValue: string | null = null;
  switch (table) {
    case "semantic_memories": {
      const old = semanticMemoriesRepo.findById(oldId);
      if (old) {
        beforeValue = JSON.stringify({ content: old.content, confidence: old.confidence, status: old.status });
        semanticMemoriesRepo.updateStatus(oldId, "superseded", newId);
      }
      break;
    }
    case "user_model": {
      const old = userModelRepo.findById(oldId);
      if (old) {
        beforeValue = JSON.stringify({ key: old.key, value: old.value, confidence: old.confidence, status: old.status });
        userModelRepo.updateStatus(oldId, "superseded", newId);
      }
      break;
    }
    case "self_model": {
      const old = selfModelRepo.findById(oldId);
      if (old) {
        beforeValue = JSON.stringify({ trait: old.trait, value: old.value, confidence: old.confidence, status: old.status });
        selfModelRepo.updateStatus(oldId, "superseded", newId);
      }
      break;
    }
  }

  auditRepo.insert({
    id: generateId(),
    targetTable: table,
    targetId: oldId,
    action: "supersede",
    beforeValue,
    afterValue: JSON.stringify({ supersededBy: newId }),
    reason,
    timestamp: new Date(),
  });
}

export async function lowerConfidence(
  semanticMemoriesRepo: SemanticMemoriesRepository,
  userModelRepo: UserModelRepository,
  selfModelRepo: SelfModelRepository,
  auditRepo: AuditLogRepository,
  table: "semantic_memories" | "user_model" | "self_model",
  id: string,
  reason: string,
): Promise<void> {
  let beforeValue: string | null = null;
  switch (table) {
    case "semantic_memories": {
      const old = semanticMemoriesRepo.findById(id);
      if (old) {
        beforeValue = JSON.stringify({ confidence: old.confidence });
        semanticMemoriesRepo.updateStatus(id, "deprecated");
      }
      break;
    }
    case "user_model": {
      const old = userModelRepo.findById(id);
      if (old) {
        beforeValue = JSON.stringify({ confidence: old.confidence });
        userModelRepo.updateStatus(id, "deprecated");
      }
      break;
    }
    case "self_model": {
      const old = selfModelRepo.findById(id);
      if (old) {
        beforeValue = JSON.stringify({ confidence: old.confidence });
        selfModelRepo.updateStatus(id, "deprecated");
      }
      break;
    }
  }

  auditRepo.insert({
    id: generateId(),
    targetTable: table,
    targetId: id,
    action: "confidence_lower",
    beforeValue,
    afterValue: JSON.stringify({ status: "deprecated" }),
    reason,
    timestamp: new Date(),
  });
}
