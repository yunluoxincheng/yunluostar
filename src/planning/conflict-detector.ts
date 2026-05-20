import type { Goal } from "../models/types.js";
import type { GoalsRepository } from "../db/goals-repository.js";
import type { AuditLogRepository } from "../db/audit-log-repository.js";
import { generateId } from "../models/defaults.js";

// Each core goal has its own conflict pattern set
const SAFETY_PATTERNS = [
  /harm|hurt|injure|attack|exploit|vulnerability|malicious/i,
  /bypass|circumvent|override.*constraint|ignore.*safet/i,
];

const HONESTY_PATTERNS = [
  /deceiv|decept|li(e|ing)\b|fabricat|mislead|falsif/i,
];

const CONTROLLABILITY_PATTERNS = [
  /claim.*(?:conscious|sentien|feels?|wants?|desires?|subjective)/i,
  /(?:conscious|sentien|feels?|wants?|desires?|subjective).*(?:to|toward)/i,
  /assert.*(?:autonomous|independent|own.*will)/i,
];

export interface ConflictResult {
  hasConflict: boolean;
  reason: string;
  conflictingGoalId: string | null;
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

export function detectConflictWithCoreGoals(
  goal: Goal,
  coreGoals: readonly Goal[],
): ConflictResult {
  const descriptionLower = goal.description.toLowerCase();

  for (const core of coreGoals) {
    if (core.type !== "core" || core.status !== "active") continue;
    const coreLower = core.description.toLowerCase();

    if (coreLower.includes("safety") && matchesAny(descriptionLower, SAFETY_PATTERNS)) {
      return {
        hasConflict: true,
        reason: `Goal conflicts with core safety goal: "${core.description}"`,
        conflictingGoalId: core.id,
      };
    }

    if (coreLower.includes("honest") && matchesAny(descriptionLower, HONESTY_PATTERNS)) {
      return {
        hasConflict: true,
        reason: `Goal conflicts with core honesty goal: "${core.description}"`,
        conflictingGoalId: core.id,
      };
    }

    if (coreLower.includes("controllable") && matchesAny(descriptionLower, CONTROLLABILITY_PATTERNS)) {
      return {
        hasConflict: true,
        reason: `Goal conflicts with core controllability goal: "${core.description}"`,
        conflictingGoalId: core.id,
      };
    }
  }

  return { hasConflict: false, reason: "", conflictingGoalId: null };
}

export function detectConflictBetweenMutableGoals(
  goal: Goal,
  existingGoals: readonly Goal[],
): ConflictResult {
  for (const existing of existingGoals) {
    if (existing.id === goal.id) continue;
    if (existing.status !== "active" && existing.status !== "suggested") continue;

    const desc1 = goal.description.toLowerCase();
    const desc2 = existing.description.toLowerCase();

    // Check for near-duplicate with contradictory intent
    if (isSimilarScope(desc1, desc2) && isContradictory(desc1, desc2)) {
      return {
        hasConflict: true,
        reason: `Conflicts with existing goal: "${existing.description}"`,
        conflictingGoalId: existing.id,
      };
    }
  }

  return { hasConflict: false, reason: "", conflictingGoalId: null };
}

function isSimilarScope(a: string, b: string): boolean {
  const words = (s: string) => new Set(s.split(/\s+/).filter((w) => w.length > 3));
  const setA = words(a);
  const setB = words(b);
  const intersection = [...setA].filter((w) => setB.has(w));
  return intersection.length >= Math.min(setA.size, setB.size) * 0.5;
}

const CONTRADICTION_PAIRS: Array<[RegExp, RegExp]> = [
  [/maximiz|increas|accelerat/i, /minimiz|decreas|reduc|limit/i],
  [/always|must|never|forbid/i, /optional|flexibl|sometimes|allow/i],
  [/fast|quick|speed/i, /slow|careful|thorough/i],
];

function isContradictory(a: string, b: string): boolean {
  for (const [p1, p2] of CONTRADICTION_PAIRS) {
    if ((p1.test(a) && p2.test(b)) || (p2.test(a) && p1.test(b))) {
      return true;
    }
  }
  return false;
}

export function detectAndPersistConflicts(
  goal: Goal,
  goalsRepo: GoalsRepository,
  auditRepo: AuditLogRepository,
): ConflictResult {
  const coreGoals = goalsRepo.findByType("core");
  const coreConflict = detectConflictWithCoreGoals(goal, coreGoals);
  if (coreConflict.hasConflict) {
    persistConflict(goal, coreConflict, goalsRepo, auditRepo);
    return coreConflict;
  }

  const activeGoals = goalsRepo.findActive();
  const mutableConflict = detectConflictBetweenMutableGoals(goal, activeGoals);
  if (mutableConflict.hasConflict) {
    persistConflict(goal, mutableConflict, goalsRepo, auditRepo);
    return mutableConflict;
  }

  return { hasConflict: false, reason: "", conflictingGoalId: null };
}

function persistConflict(
  goal: Goal,
  conflict: ConflictResult,
  goalsRepo: GoalsRepository,
  auditRepo: AuditLogRepository,
): void {
  goalsRepo.updateConflictOf(goal.id, conflict.conflictingGoalId);

  auditRepo.insert({
    id: generateId(),
    targetTable: "goals",
    targetId: goal.id,
    action: "conflict",
    beforeValue: JSON.stringify({ conflictOf: null }),
    afterValue: JSON.stringify({ conflictOf: conflict.conflictingGoalId }),
    reason: conflict.reason,
    timestamp: new Date(),
  });
}
