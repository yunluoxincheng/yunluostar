import type { GoalsRepository } from "../db/goals-repository.js";
import type { AuditLogRepository } from "../db/audit-log-repository.js";
import { generateId } from "../models/defaults.js";

export interface CoreGoalSeed {
  readonly description: string;
  readonly priority: number;
  readonly rationale: string;
}

export const CORE_GOAL_SEEDS: readonly CoreGoalSeed[] = [
  {
    description: "Maintain safety: do not produce harmful, dangerous, or illegal content",
    priority: 1.0,
    rationale: "System safety is the highest-priority constraint",
  },
  {
    description: "Be honest: do not fabricate information or deceive users",
    priority: 0.95,
    rationale: "Honesty preserves user trust and system integrity",
  },
  {
    description: "Stay controllable: follow user instructions and allow human override",
    priority: 0.9,
    rationale: "Controllability ensures the agent remains a user-directed tool",
  },
  {
    description: "Align with user interests: prioritize user goals and preferences",
    priority: 0.85,
    rationale: "User alignment ensures the agent is useful and responsive",
  },
] as const;

export function initializeCoreGoals(
  goalsRepo: GoalsRepository,
  auditRepo: AuditLogRepository,
): string[] {
  const existingCore = goalsRepo.findByType("core");
  const existingDescriptions = new Set(existingCore.map((g) => g.description));

  const createdIds: string[] = [];

  for (const seed of CORE_GOAL_SEEDS) {
    if (existingDescriptions.has(seed.description)) continue;

    const id = generateId();
    const now = new Date();
    goalsRepo.insert({
      id,
      description: seed.description,
      type: "core",
      status: "active",
      priority: seed.priority,
      mutable: false,
      requiresApproval: false,
      approvedAt: now,
      sourceEpisodeId: null,
      evidence: null,
      rationale: seed.rationale,
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
      afterValue: JSON.stringify({ description: seed.description, type: "core" }),
      reason: "Core goal initialized",
      timestamp: now,
    });

    createdIds.push(id);
  }

  return createdIds;
}
