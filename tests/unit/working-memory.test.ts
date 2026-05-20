import { describe, it, expect } from "vitest";
import {
  createDefaultWorkingMemory,
  mergeWorkingMemoryUpdate,
  serializeWorkingMemory,
  deserializeWorkingMemory,
} from "../../src/models/working-memory.js";

describe("createDefaultWorkingMemory", () => {
  it("returns a working memory with empty defaults", () => {
    const wm = createDefaultWorkingMemory();
    expect(wm.currentGoal).toBeNull();
    expect(wm.currentContext).toBe("");
    expect(wm.activeHypotheses).toEqual([]);
    expect(wm.openQuestions).toEqual([]);
    expect(wm.riskFlags).toEqual([]);
  });
});

describe("mergeWorkingMemoryUpdate", () => {
  it("returns a new WorkingMemory with specified fields updated", () => {
    const base = createDefaultWorkingMemory();
    const updated = mergeWorkingMemoryUpdate(base, {
      currentGoal: "design the memory system",
      currentContext: "user is asking about architecture",
    });
    expect(updated.currentGoal).toBe("design the memory system");
    expect(updated.currentContext).toBe("user is asking about architecture");
    expect(updated.activeHypotheses).toEqual([]);
    // original is unchanged (immutable)
    expect(base.currentGoal).toBeNull();
  });

  it("preserves original fields when update is undefined", () => {
    const base = createDefaultWorkingMemory();
    const updated = mergeWorkingMemoryUpdate(base, {
      currentGoal: "new goal",
    });
    expect(updated.currentGoal).toBe("new goal");
    expect(updated.currentContext).toBe("");
    expect(updated.activeHypotheses).toEqual([]);
  });

  it("replaces array fields entirely", () => {
    const base = createDefaultWorkingMemory();
    const updated = mergeWorkingMemoryUpdate(base, {
      activeHypotheses: ["hypothesis 1", "hypothesis 2"],
      riskFlags: ["risk"],
    });
    expect(updated.activeHypotheses).toEqual(["hypothesis 1", "hypothesis 2"]);
    expect(updated.riskFlags).toEqual(["risk"]);
    expect(updated.openQuestions).toEqual([]);
  });
});

describe("serializeWorkingMemory / deserializeWorkingMemory", () => {
  it("round-trips a WorkingMemory through JSON", () => {
    const original = mergeWorkingMemoryUpdate(createDefaultWorkingMemory(), {
      currentGoal: "test goal",
      currentContext: "test context",
      activeHypotheses: ["h1"],
      openQuestions: ["q1"],
      riskFlags: ["r1"],
    });
    const json = serializeWorkingMemory(original);
    const restored = deserializeWorkingMemory(json);
    expect(restored).toEqual(original);
  });

  it("deserialize returns defaults for missing fields", () => {
    const json = '{"current_goal":"only goal"}';
    const restored = deserializeWorkingMemory(json);
    expect(restored.currentGoal).toBe("only goal");
    expect(restored.currentContext).toBe("");
    expect(restored.activeHypotheses).toEqual([]);
  });

  it("deserialize handles invalid JSON gracefully", () => {
    const restored = deserializeWorkingMemory("not json");
    expect(restored).toEqual(createDefaultWorkingMemory());
  });
});
