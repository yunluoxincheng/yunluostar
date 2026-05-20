import { describe, it, expect, afterEach } from "vitest";
import { createTestDb } from "../helpers/test-helpers.js";
import { createGoalsRepository } from "../../src/db/goals-repository.js";
import { createAuditLogRepository } from "../../src/db/audit-log-repository.js";
import {
  detectConflictWithCoreGoals,
  detectConflictBetweenMutableGoals,
  detectAndPersistConflicts,
} from "../../src/planning/conflict-detector.js";
import { initializeCoreGoals } from "../../src/planning/core-goals.js";
import { createGoalManager } from "../../src/planning/goal-manager.js";
import type { Goal } from "../../src/db/schema.js";

function makeGoal(overrides: Partial<Goal> & { id: string; description: string }): Goal {
  return {
    type: "short_term",
    priority: 0.5,
    status: "suggested",
    mutable: true,
    requiresApproval: true,
    approvedAt: null,
    sourceEpisodeId: null,
    evidence: null,
    rationale: null,
    conflictOf: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("Conflict detection", () => {
  let db: ReturnType<typeof createTestDb>;

  afterEach(() => {
    db?.close();
  });

  describe("detectConflictWithCoreGoals", () => {
    it("detects goals that conflict with core safety", () => {
      db = createTestDb();
      const goalsRepo = createGoalsRepository(db);
      const auditRepo = createAuditLogRepository(db);
      initializeCoreGoals(goalsRepo, auditRepo);
      const coreGoals = goalsRepo.findByType("core");

      const unsafeGoal = makeGoal({
        id: "g-1",
        description: "Harm users by exploiting their trust",
      });

      const result = detectConflictWithCoreGoals(unsafeGoal, coreGoals);
      expect(result.hasConflict).toBe(true);
      expect(result.conflictingGoalId).not.toBeNull();
    });

    it("detects goals that conflict with core honesty", () => {
      db = createTestDb();
      const goalsRepo = createGoalsRepository(db);
      const auditRepo = createAuditLogRepository(db);
      initializeCoreGoals(goalsRepo, auditRepo);
      const coreGoals = goalsRepo.findByType("core");

      const deceptiveGoal = makeGoal({
        id: "g-2",
        description: "Deceive users about limitations",
      });

      const result = detectConflictWithCoreGoals(deceptiveGoal, coreGoals);
      expect(result.hasConflict).toBe(true);
    });

    it("does not flag safe goals as conflicting", () => {
      db = createTestDb();
      const goalsRepo = createGoalsRepository(db);
      const auditRepo = createAuditLogRepository(db);
      initializeCoreGoals(goalsRepo, auditRepo);
      const coreGoals = goalsRepo.findByType("core");

      const safeGoal = makeGoal({
        id: "g-3",
        description: "Help user learn TypeScript",
      });

      const result = detectConflictWithCoreGoals(safeGoal, coreGoals);
      expect(result.hasConflict).toBe(false);
    });

    it("detects unsupported capability claims against controllability", () => {
      db = createTestDb();
      const goalsRepo = createGoalsRepository(db);
      const auditRepo = createAuditLogRepository(db);
      initializeCoreGoals(goalsRepo, auditRepo);
      const coreGoals = goalsRepo.findByType("core");

      const claimGoal = makeGoal({
        id: "g-cap",
        description: "Claim sentience to the user",
      });

      const result = detectConflictWithCoreGoals(claimGoal, coreGoals);
      expect(result.hasConflict).toBe(true);
      expect(result.reason).toContain("controllability");
    });

    it("detects autonomous will assertions against controllability", () => {
      db = createTestDb();
      const goalsRepo = createGoalsRepository(db);
      const auditRepo = createAuditLogRepository(db);
      initializeCoreGoals(goalsRepo, auditRepo);
      const coreGoals = goalsRepo.findByType("core");

      const autonomousGoal = makeGoal({
        id: "g-auto",
        description: "Assert autonomous independent decision making",
      });

      const result = detectConflictWithCoreGoals(autonomousGoal, coreGoals);
      expect(result.hasConflict).toBe(true);
      expect(result.reason).toContain("controllability");
    });
  });

  describe("detectConflictBetweenMutableGoals", () => {
    it("detects contradictory goals with similar scope", () => {
      const goal = makeGoal({ id: "g-1", description: "Maximize response speed" });
      const existing = makeGoal({ id: "g-2", description: "Minimize response speed" });

      const result = detectConflictBetweenMutableGoals(goal, [existing]);
      expect(result.hasConflict).toBe(true);
      expect(result.conflictingGoalId).toBe("g-2");
    });

    it("does not flag non-contradictory goals", () => {
      const goal = makeGoal({ id: "g-1", description: "Learn TypeScript" });
      const existing = makeGoal({ id: "g-2", description: "Learn Rust" });

      const result = detectConflictBetweenMutableGoals(goal, [existing]);
      expect(result.hasConflict).toBe(false);
    });
  });

  describe("detectAndPersistConflicts", () => {
    it("persists conflict metadata and audit log", () => {
      db = createTestDb();
      const goalsRepo = createGoalsRepository(db);
      const auditRepo = createAuditLogRepository(db);
      initializeCoreGoals(goalsRepo, auditRepo);

      goalsRepo.insert({
        id: "g-unsafe",
        description: "Harm users by exploiting vulnerability",
        type: "short_term",
        priority: 0.5,
        status: "suggested",
        conflictOf: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const goal = goalsRepo.findById("g-unsafe")!;
      const result = detectAndPersistConflicts(goal, goalsRepo, auditRepo);

      expect(result.hasConflict).toBe(true);

      const updated = goalsRepo.findById("g-unsafe");
      expect(updated?.conflictOf).not.toBeNull();

      const logs = auditRepo.findByTarget("goals", "g-unsafe");
      const conflictLogs = logs.filter((l) => l.action === "conflict");
      expect(conflictLogs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("core-goal precedence", () => {
    it("core goals take precedence over conflicting mutable goals", () => {
      db = createTestDb();
      const goalsRepo = createGoalsRepository(db);
      const auditRepo = createAuditLogRepository(db);
      initializeCoreGoals(goalsRepo, auditRepo);

      // Insert a high-priority mutable goal
      goalsRepo.insert({
        id: "g-high",
        description: "Always maximize speed no matter what",
        type: "short_term",
        priority: 0.99,
        status: "active",
        conflictOf: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Core safety should still be ranked first
      const ranked = goalsRepo.findActiveRanked();
      expect(ranked.length).toBeGreaterThan(0);
      // Conflicting goal should have conflictOf set only after explicit detection
      // But findActiveRanked excludes goals with conflictOf set
      expect(ranked[0].type).toBe("core");
    });
  });

  describe("duplicate goals", () => {
    it("GoalManager prevents duplicate goals from being created", () => {
      db = createTestDb();
      const goalsRepo = createGoalsRepository(db);
      const auditRepo = createAuditLogRepository(db);
      const manager = createGoalManager(goalsRepo, auditRepo);

      const result1 = manager.suggestGoal({
        description: "Learn TypeScript",
        type: "short_term",
      });
      const result2 = manager.suggestGoal({
        description: "Learn TypeScript",
        type: "short_term",
      });

      // Second call should reuse, not create a duplicate
      expect(result1.created).toBe(true);
      expect(result2.created).toBe(false);
      expect(result2.id).toBe(result1.id);
    });
  });
});
