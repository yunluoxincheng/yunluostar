import { describe, it, expect } from "vitest";
import { safeReflection } from "../../src/llm/safe-outputs.js";

describe("safeReflection with workingMemoryUpdate", () => {
  it("extracts workingMemoryUpdate when present", () => {
    const result = safeReflection({
      whatWorked: "ok",
      whatFailed: "none",
      lessons: "learned something",
      updateCandidates: "[]",
      workingMemoryUpdate: {
        current_goal: "new goal",
        current_context: "new context",
        active_hypotheses: ["h1"],
        open_questions: ["q1"],
        risk_flags: [],
      },
    });
    expect(result.workingMemoryUpdate).toEqual({
      current_goal: "new goal",
      current_context: "new context",
      active_hypotheses: ["h1"],
      open_questions: ["q1"],
      risk_flags: [],
    });
  });

  it("returns undefined workingMemoryUpdate when absent", () => {
    const result = safeReflection({
      whatWorked: "ok",
      whatFailed: "none",
      lessons: "learned something",
      updateCandidates: "[]",
    });
    expect(result.workingMemoryUpdate).toBeUndefined();
  });

  it("returns undefined when workingMemoryUpdate is null", () => {
    const result = safeReflection({
      whatWorked: "ok",
      whatFailed: "none",
      lessons: "learned something",
      updateCandidates: "[]",
      workingMemoryUpdate: null,
    });
    expect(result.workingMemoryUpdate).toBeUndefined();
  });

  it("filters non-string elements from arrays in workingMemoryUpdate", () => {
    const result = safeReflection({
      whatWorked: "ok",
      whatFailed: "none",
      lessons: "learned",
      updateCandidates: "[]",
      workingMemoryUpdate: {
        active_hypotheses: ["valid", 42, null, "also valid"] as unknown as string[],
        open_questions: [1, 2] as unknown as string[],
        risk_flags: [],
      },
    });
    expect(result.workingMemoryUpdate!.active_hypotheses).toEqual(["valid", "also valid"]);
    expect(result.workingMemoryUpdate!.open_questions).toEqual([]);
  });
});
