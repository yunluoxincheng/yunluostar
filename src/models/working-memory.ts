export interface WorkingMemory {
  readonly currentGoal: string | null;
  readonly currentContext: string;
  readonly activeHypotheses: readonly string[];
  readonly openQuestions: readonly string[];
  readonly riskFlags: readonly string[];
}

export interface WorkingMemoryUpdate {
  readonly currentGoal?: string | null;
  readonly currentContext?: string;
  readonly activeHypotheses?: readonly string[];
  readonly openQuestions?: readonly string[];
  readonly riskFlags?: readonly string[];
}

export function createDefaultWorkingMemory(): WorkingMemory {
  return {
    currentGoal: null,
    currentContext: "",
    activeHypotheses: [],
    openQuestions: [],
    riskFlags: [],
  };
}

export function mergeWorkingMemoryUpdate(
  base: WorkingMemory,
  update: WorkingMemoryUpdate,
): WorkingMemory {
  return {
    currentGoal:
      update.currentGoal !== undefined
        ? update.currentGoal
        : base.currentGoal,
    currentContext:
      update.currentContext !== undefined
        ? update.currentContext
        : base.currentContext,
    activeHypotheses:
      update.activeHypotheses !== undefined
        ? [...update.activeHypotheses]
        : [...base.activeHypotheses],
    openQuestions:
      update.openQuestions !== undefined
        ? [...update.openQuestions]
        : [...base.openQuestions],
    riskFlags:
      update.riskFlags !== undefined
        ? [...update.riskFlags]
        : [...base.riskFlags],
  };
}

export function serializeWorkingMemory(wm: WorkingMemory): string {
  return JSON.stringify({
    current_goal: wm.currentGoal,
    current_context: wm.currentContext,
    active_hypotheses: wm.activeHypotheses,
    open_questions: wm.openQuestions,
    risk_flags: wm.riskFlags,
  });
}

export function deserializeWorkingMemory(json: string): WorkingMemory {
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    return {
      currentGoal:
        typeof parsed.current_goal === "string"
          ? parsed.current_goal
          : parsed.current_goal === null
            ? null
            : null,
      currentContext:
        typeof parsed.current_context === "string"
          ? parsed.current_context
          : "",
      activeHypotheses: Array.isArray(parsed.active_hypotheses)
        ? (parsed.active_hypotheses as unknown[]).filter(
            (h): h is string => typeof h === "string",
          )
        : [],
      openQuestions: Array.isArray(parsed.open_questions)
        ? (parsed.open_questions as unknown[]).filter(
            (q): q is string => typeof q === "string",
          )
        : [],
      riskFlags: Array.isArray(parsed.risk_flags)
        ? (parsed.risk_flags as unknown[]).filter(
            (r): r is string => typeof r === "string",
          )
        : [],
    };
  } catch {
    return createDefaultWorkingMemory();
  }
}
