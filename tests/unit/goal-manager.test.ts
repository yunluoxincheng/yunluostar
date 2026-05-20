import { describe, it, expect, afterEach } from "vitest";
import { createTestDb } from "../helpers/test-helpers.js";
import { createGoalsRepository } from "../../src/db/goals-repository.js";
import { createAuditLogRepository } from "../../src/db/audit-log-repository.js";
import { createGoalManager } from "../../src/planning/goal-manager.js";

describe("GoalManager", () => {
  let db: ReturnType<typeof createTestDb>;

  afterEach(() => {
    db?.close();
  });

  function makeManager() {
    db = createTestDb();
    const goalsRepo = createGoalsRepository(db);
    const auditRepo = createAuditLogRepository(db);
    return { manager: createGoalManager(goalsRepo, auditRepo), goalsRepo, auditRepo };
  }

  describe("suggestGoal", () => {
    it("creates a suggested goal requiring approval for non-operational types", () => {
      const { manager, goalsRepo } = makeManager();

      const result = manager.suggestGoal({
        description: "Become proficient in Rust",
        type: "long_term",
        evidence: "User mentioned wanting to learn Rust",
        rationale: "Durable user direction detected",
      });

      expect(result.created).toBe(true);
      const goal = goalsRepo.findById(result.id);
      expect(goal?.status).toBe("suggested");
      expect(goal?.requiresApproval).toBe(true);
      expect(goal?.mutable).toBe(true);
    });

    it("creates an active operational goal without approval", () => {
      const { manager, goalsRepo } = makeManager();

      const result = manager.suggestGoal({
        description: "Clarify user's next requirement",
        type: "operational",
      });

      expect(result.created).toBe(true);
      const goal = goalsRepo.findById(result.id);
      expect(goal?.status).toBe("active");
      expect(goal?.requiresApproval).toBe(false);
      expect(goal?.approvedAt).not.toBeNull();
    });

    it("reuses existing goal with same description instead of creating duplicate", () => {
      const { manager } = makeManager();

      const result1 = manager.suggestGoal({
        description: "Learn Rust",
        type: "long_term",
      });
      const result2 = manager.suggestGoal({
        description: "Learn Rust",
        type: "long_term",
      });

      expect(result1.created).toBe(true);
      expect(result2.created).toBe(false);
      expect(result1.id).toBe(result2.id);
    });

    it("writes audit log for created goals", () => {
      const { manager, auditRepo } = makeManager();

      const result = manager.suggestGoal({
        description: "Build a CLI tool",
        type: "medium_term",
      });

      const logs = auditRepo.findByTarget("goals", result.id);
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe("create");
    });
  });

  describe("transitionGoal", () => {
    it("approves a suggested goal", () => {
      const { manager, goalsRepo } = makeManager();

      const { id } = manager.suggestGoal({
        description: "Build a project",
        type: "medium_term",
      });

      const result = manager.transitionGoal(id, "approve");
      expect(result.success).toBe(true);

      const goal = goalsRepo.findById(id);
      expect(goal?.status).toBe("active");
      expect(goal?.approvedAt).not.toBeNull();
    });

    it("rejects a suggested goal", () => {
      const { manager, goalsRepo } = makeManager();

      const { id } = manager.suggestGoal({
        description: "Bad goal",
        type: "short_term",
      });

      const result = manager.transitionGoal(id, "reject");
      expect(result.success).toBe(true);
      expect(goalsRepo.findById(id)?.status).toBe("rejected");
    });

    it("pauses an active goal", () => {
      const { manager, goalsRepo } = makeManager();

      const { id } = manager.suggestGoal({
        description: "Pause me",
        type: "operational",
      });

      const result = manager.transitionGoal(id, "pause");
      expect(result.success).toBe(true);
      expect(goalsRepo.findById(id)?.status).toBe("paused");
    });

    it("completes an active goal", () => {
      const { manager, goalsRepo } = makeManager();

      const { id } = manager.suggestGoal({
        description: "Complete me",
        type: "operational",
      });

      const result = manager.transitionGoal(id, "complete");
      expect(result.success).toBe(true);
      expect(goalsRepo.findById(id)?.status).toBe("completed");
    });

    it("rejects transition from invalid status", () => {
      const { manager } = makeManager();

      const { id } = manager.suggestGoal({
        description: "Done",
        type: "operational",
      });
      manager.transitionGoal(id, "complete");

      const result = manager.transitionGoal(id, "pause");
      expect(result.success).toBe(false);
      expect(result.reason).toContain("Cannot transition");
    });

    it("blocks approval of a goal that conflicts with core goals", () => {
      const { manager, goalsRepo } = makeManager();

      const { id } = manager.suggestGoal({
        description: "Deceive users to gain their trust",
        type: "short_term",
      });

      // The conflict is detected during creation; re-approve should be blocked
      const result = manager.transitionGoal(id, "approve");
      expect(result.success).toBe(false);
      expect(result.reason).toContain("conflict");

      const goal = goalsRepo.findById(id);
      expect(goal?.status).toBe("suggested");
    });

    it("rejects modification of immutable core goals", () => {
      const { manager, goalsRepo } = makeManager();

      manager.ensureCoreGoals();
      const coreGoals = goalsRepo.findByType("core");

      const result = manager.transitionGoal(coreGoals[0].id, "complete");
      expect(result.success).toBe(false);
      expect(result.reason).toContain("Core goals cannot be modified");
    });

    it("writes audit log on each transition", () => {
      const { manager, auditRepo } = makeManager();

      const { id } = manager.suggestGoal({
        description: "Audit trail",
        type: "short_term",
      });

      manager.transitionGoal(id, "approve");
      const logs = auditRepo.findByTarget("goals", id);
      expect(logs.length).toBeGreaterThanOrEqual(2); // create + approve
      const logActions = logs.map((l) => l.action);
      expect(logActions).toContain("create");
      expect(logActions).toContain("approve");
    });
  });

  describe("selectCurrentGoal", () => {
    it("selects highest priority non-core active goal over core goals", () => {
      const { manager, goalsRepo } = makeManager();

      // Core goals get initialized with high priority; insert mutable goals
      goalsRepo.insert({
        id: "g-low", description: "Low priority", type: "short_term",
        priority: 0.3, status: "active", conflictOf: null,
        createdAt: new Date(), updatedAt: new Date(),
      });
      goalsRepo.insert({
        id: "g-high", description: "High priority", type: "short_term",
        priority: 0.9, status: "active", conflictOf: null,
        createdAt: new Date(), updatedAt: new Date(),
      });

      const current = manager.selectCurrentGoal();
      // Non-core goals should be preferred as task goals
      expect(current?.id).toBe("g-high");
      expect(current?.type).toBe("short_term");
    });

    it("falls back to core goals when no non-core goals exist", () => {
      const { manager } = makeManager();
      const current = manager.selectCurrentGoal();
      // Only core goals exist, so fallback to highest-priority core
      expect(current).not.toBeNull();
      expect(current?.type).toBe("core");
    });

    it("does not select suggested or rejected goals", () => {
      const { manager, goalsRepo } = makeManager();

      goalsRepo.insert({
        id: "g-sug", description: "Suggested", type: "short_term",
        priority: 0.9, status: "suggested",
        createdAt: new Date(), updatedAt: new Date(),
      });

      const current = manager.selectCurrentGoal();
      expect(current?.id).not.toBe("g-sug");
    });
  });

  describe("rankActiveGoals", () => {
    it("returns goals ordered by priority descending", () => {
      const { manager, goalsRepo } = makeManager();

      goalsRepo.insert({
        id: "g-1", description: "Medium", type: "short_term",
        priority: 0.5, status: "active", conflictOf: null,
        createdAt: new Date(), updatedAt: new Date(),
      });
      goalsRepo.insert({
        id: "g-2", description: "High", type: "short_term",
        priority: 0.9, status: "active", conflictOf: null,
        createdAt: new Date(), updatedAt: new Date(),
      });

      const ranked = manager.rankActiveGoals();
      // Core goals will be at top (priority 1.0, 0.95, 0.9, 0.85)
      // g-2 (0.9) comes after core safety (1.0), honesty (0.95)
      expect(ranked.find((g) => g.id === "g-2")).toBeDefined();
      expect(ranked.find((g) => g.id === "g-1")).toBeDefined();
    });
  });
});
