import type { GoalsRepository } from "../db/goals-repository.js";
import type { AuditLogRepository } from "../db/audit-log-repository.js";
import { generateId } from "../models/defaults.js";
import { initializeCoreGoals } from "./core-goals.js";
import { detectAndPersistConflicts } from "./conflict-detector.js";
import type { Goal } from "../models/types.js";
import type { GoalType, GoalStatus } from "../db/schema.js";

export interface SuggestGoalInput {
  description: string;
  type: GoalType;
  priority?: number;
  sourceEpisodeId?: string;
  evidence?: string;
  rationale?: string;
}

const VALID_TRANSITIONS: Record<GoalStatus, GoalStatus[]> = {
  suggested: ["active", "rejected", "deprecated"],
  active: ["paused", "completed", "deprecated"],
  paused: ["active", "deprecated"],
  completed: [],
  rejected: [],
  deprecated: [],
};

export function createGoalManager(
  goalsRepo: GoalsRepository,
  auditRepo: AuditLogRepository,
) {
  let coreInitialized = false;

  function ensureCoreGoals(): string[] {
    if (coreInitialized) {
      const existing = goalsRepo.findByType("core");
      if (existing.length > 0) return [];
    }
    const ids = initializeCoreGoals(goalsRepo, auditRepo);
    coreInitialized = true;
    return ids;
  }

  function suggestGoal(input: SuggestGoalInput): { id: string; created: boolean; reason: string } {
    ensureCoreGoals();

    // Duplicate detection: check for same description
    const existing = goalsRepo.findByDescription(input.description);
    const activeOrSuggested = existing.filter(
      (g) => g.status === "active" || g.status === "suggested",
    );

    if (activeOrSuggested.length > 0) {
      const match = activeOrSuggested[0];
      return {
        id: match.id,
        created: false,
        reason: `Goal already exists with status "${match.status}"`,
      };
    }

    const isOperational = input.type === "operational";
    const requiresApproval = !isOperational;
    const status: GoalStatus = isOperational ? "active" : "suggested";
    const id = generateId();
    const now = new Date();

    goalsRepo.insert({
      id,
      description: input.description,
      type: input.type,
      status,
      priority: input.priority ?? 0.5,
      mutable: true,
      requiresApproval,
      approvedAt: isOperational ? now : null,
      sourceEpisodeId: input.sourceEpisodeId ?? null,
      evidence: input.evidence ?? null,
      rationale: input.rationale ?? null,
      conflictOf: null,
      createdAt: now,
      updatedAt: now,
    });

    auditRepo.insert({
      id: generateId(),
      targetTable: "goals",
      targetId: id,
      action: "create",
      beforeValue: null,
      afterValue: JSON.stringify({ description: input.description, type: input.type, status }),
      reason: requiresApproval
        ? "Suggested goal created from interaction, awaiting approval"
        : "Operational goal created",
      timestamp: now,
    });

    // Run conflict detection against core and active mutable goals
    const created = goalsRepo.findById(id)!;
    const conflict = detectAndPersistConflicts(created, goalsRepo, auditRepo);
    if (conflict.hasConflict) {
      return { id, created: true, reason: `Goal created with conflict: ${conflict.reason}` };
    }

    return { id, created: true, reason: "Goal created" };
  }

  function transitionGoal(goalId: string, action: "approve" | "reject" | "pause" | "complete"): { success: boolean; reason: string } {
    const goal = goalsRepo.findById(goalId);
    if (!goal) return { success: false, reason: "Goal not found" };
    if (!goal.mutable) return { success: false, reason: "Core goals cannot be modified" };

    const statusMap: Record<string, GoalStatus> = {
      approve: "active",
      reject: "rejected",
      pause: "paused",
      complete: "completed",
    };

    const newStatus = statusMap[action];
    if (!newStatus) return { success: false, reason: `Unknown action: ${action}` };

    const allowed = VALID_TRANSITIONS[goal.status];
    if (!allowed.includes(newStatus)) {
      return { success: false, reason: `Cannot transition from "${goal.status}" to "${newStatus}"` };
    }

    const beforeStatus = goal.status;
    const now = new Date();

    // Before activating, check for conflicts with core or active mutable goals
    if (action === "approve") {
      const conflict = detectAndPersistConflicts(goal, goalsRepo, auditRepo);
      if (conflict.hasConflict) {
        auditRepo.insert({
          id: generateId(),
          targetTable: "goals",
          targetId: goalId,
          action: "conflict",
          beforeValue: JSON.stringify({ status: beforeStatus }),
          afterValue: JSON.stringify({ status: "suggested", conflictOf: conflict.conflictingGoalId }),
          reason: `Approval blocked: ${conflict.reason}`,
          timestamp: now,
        });
        return { success: false, reason: `Cannot approve: ${conflict.reason}` };
      }
    }

    goalsRepo.updateStatus(goalId, newStatus);

    if (action === "approve") {
      goalsRepo.updateApprovedAt(goalId, now);
    }

    auditRepo.insert({
      id: generateId(),
      targetTable: "goals",
      targetId: goalId,
      action: action === "approve" ? "approve"
        : action === "reject" ? "reject"
        : action === "pause" ? "pause"
        : "complete",
      beforeValue: JSON.stringify({ status: beforeStatus }),
      afterValue: JSON.stringify({ status: newStatus }),
      reason: `Goal ${action}d by user`,
      timestamp: now,
    });

    return { success: true, reason: `Goal ${action}d` };
  }

  function selectCurrentGoal(): Goal | null {
    ensureCoreGoals();

    const ranked = goalsRepo.findActiveRanked();
    if (ranked.length === 0) return null;

    // Prefer non-core goals as the current task goal;
    // core goals constrain selection but are not task goals
    const nonCore = ranked.filter((g) => g.type !== "core");
    if (nonCore.length > 0) return nonCore[0];

    // Fallback to highest-priority core goal if nothing else exists
    return ranked[0];
  }

  function rankActiveGoals(): Goal[] {
    return goalsRepo.findActiveRanked();
  }

  return {
    ensureCoreGoals,
    suggestGoal,
    transitionGoal,
    selectCurrentGoal,
    rankActiveGoals,
  };
}

export type GoalManager = ReturnType<typeof createGoalManager>;
