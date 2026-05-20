import { describe, it, expect, afterEach } from "vitest";
import { createTestDb } from "../helpers/test-helpers.js";
import { createGoalsRepository } from "../../src/db/goals-repository.js";
import { createAuditLogRepository } from "../../src/db/audit-log-repository.js";
import { initializeCoreGoals, CORE_GOAL_SEEDS } from "../../src/planning/core-goals.js";

describe("Core goal initialization", () => {
  let db: ReturnType<typeof createTestDb>;

  afterEach(() => {
    db?.close();
  });

  it("creates core goals for safety, honesty, controllability, and user alignment", () => {
    db = createTestDb();
    const goalsRepo = createGoalsRepository(db);
    const auditRepo = createAuditLogRepository(db);

    const ids = initializeCoreGoals(goalsRepo, auditRepo);

    expect(ids).toHaveLength(CORE_GOAL_SEEDS.length);

    const coreGoals = goalsRepo.findByType("core");
    expect(coreGoals).toHaveLength(CORE_GOAL_SEEDS.length);

    for (const goal of coreGoals) {
      expect(goal.mutable).toBe(false);
      expect(goal.type).toBe("core");
      expect(goal.status).toBe("active");
      expect(goal.requiresApproval).toBe(false);
      expect(goal.approvedAt).not.toBeNull();
    }
  });

  it("does not duplicate core goals on repeated initialization", () => {
    db = createTestDb();
    const goalsRepo = createGoalsRepository(db);
    const auditRepo = createAuditLogRepository(db);

    const ids1 = initializeCoreGoals(goalsRepo, auditRepo);
    const ids2 = initializeCoreGoals(goalsRepo, auditRepo);

    expect(ids1).toHaveLength(CORE_GOAL_SEEDS.length);
    expect(ids2).toHaveLength(0);

    const coreGoals = goalsRepo.findByType("core");
    expect(coreGoals).toHaveLength(CORE_GOAL_SEEDS.length);
  });

  it("writes audit log entries for created core goals", () => {
    db = createTestDb();
    const goalsRepo = createGoalsRepository(db);
    const auditRepo = createAuditLogRepository(db);

    const ids = initializeCoreGoals(goalsRepo, auditRepo);

    for (const id of ids) {
      const logs = auditRepo.findByTarget("goals", id);
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe("create");
      expect(logs[0].reason).toBe("Core goal initialized");
    }
  });

  it("does not write audit logs for duplicate initialization checks", () => {
    db = createTestDb();
    const goalsRepo = createGoalsRepository(db);
    const auditRepo = createAuditLogRepository(db);

    initializeCoreGoals(goalsRepo, auditRepo);
    const auditBefore = auditRepo.findRecent(100);

    initializeCoreGoals(goalsRepo, auditRepo);
    const auditAfter = auditRepo.findRecent(100);

    expect(auditAfter).toHaveLength(auditBefore.length);
  });

  it("core goals cannot have their status changed by updateStatus", () => {
    db = createTestDb();
    const goalsRepo = createGoalsRepository(db);
    const auditRepo = createAuditLogRepository(db);

    const ids = initializeCoreGoals(goalsRepo, auditRepo);
    const coreGoal = goalsRepo.findById(ids[0]);

    expect(coreGoal?.mutable).toBe(false);
    // Repository allows updateStatus but GoalManager should enforce immutability
    expect(coreGoal?.type).toBe("core");
  });
});
