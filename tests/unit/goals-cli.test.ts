import { describe, it, expect, afterEach } from "vitest";
import { createTestDb } from "../helpers/test-helpers.js";
import { createGoalsRepository } from "../../src/db/goals-repository.js";
import { createAuditLogRepository } from "../../src/db/audit-log-repository.js";
import { createGoalManager } from "../../src/planning/goal-manager.js";
import { goalTransitionSchema } from "../../src/models/schemas.js";

describe("CLI goals transition commands", () => {
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

  it("validates goal transition input with zod", () => {
    const valid = goalTransitionSchema.safeParse({
      goalId: "g-1",
      action: "approve",
    });
    expect(valid.success).toBe(true);

    const invalid = goalTransitionSchema.safeParse({
      goalId: "",
      action: "delete",
    });
    expect(invalid.success).toBe(false);
  });

  it("approve command activates a suggested goal", () => {
    const { manager, goalsRepo } = makeManager();

    const { id } = manager.suggestGoal({
      description: "Learn TypeScript",
      type: "medium_term",
    });

    expect(goalsRepo.findById(id)?.status).toBe("suggested");

    const result = manager.transitionGoal(id, "approve");
    expect(result.success).toBe(true);
    expect(goalsRepo.findById(id)?.status).toBe("active");
  });

  it("reject command rejects a suggested goal", () => {
    const { manager, goalsRepo } = makeManager();

    const { id } = manager.suggestGoal({
      description: "Bad idea",
      type: "short_term",
    });

    const result = manager.transitionGoal(id, "reject");
    expect(result.success).toBe(true);
    expect(goalsRepo.findById(id)?.status).toBe("rejected");
  });

  it("pause command pauses an active goal", () => {
    const { manager, goalsRepo } = makeManager();

    const { id } = manager.suggestGoal({
      description: "Working goal",
      type: "operational",
    });

    expect(goalsRepo.findById(id)?.status).toBe("active");

    const result = manager.transitionGoal(id, "pause");
    expect(result.success).toBe(true);
    expect(goalsRepo.findById(id)?.status).toBe("paused");
  });

  it("complete command completes an active goal", () => {
    const { manager, goalsRepo } = makeManager();

    const { id } = manager.suggestGoal({
      description: "Finish task",
      type: "operational",
    });

    const result = manager.transitionGoal(id, "complete");
    expect(result.success).toBe(true);
    expect(goalsRepo.findById(id)?.status).toBe("completed");
  });

  it("returns error for unknown goal id", () => {
    const { manager } = makeManager();

    const result = manager.transitionGoal("nonexistent", "approve");
    expect(result.success).toBe(false);
    expect(result.reason).toContain("not found");
  });

  it("shows hierarchy in goals list output", () => {
    const { manager, goalsRepo } = makeManager();

    manager.ensureCoreGoals();
    manager.suggestGoal({
      description: "Learn Rust",
      type: "long_term",
    });
    manager.suggestGoal({
      description: "Quick task",
      type: "operational",
    });

    const items = goalsRepo.findAll();
    const types = [...new Set(items.map((g) => g.type))];
    expect(types).toContain("core");
    expect(types).toContain("long_term");
    expect(types).toContain("operational");
  });

  it("goal display uses system-state language", () => {
    const { manager, goalsRepo } = makeManager();

    manager.suggestGoal({
      description: "Tracked system goal: improve response accuracy",
      type: "medium_term",
    });

    const items = goalsRepo.findAll();
    for (const g of items) {
      // Goals should not contain subjective desire language
      expect(g.description.toLowerCase()).not.toContain("i want");
      expect(g.description.toLowerCase()).not.toContain("i feel");
    }
  });
});
