import type { EpisodeExtraction, ReflectionOutput, ConsolidationOutput } from "./client.js";
import {
  FALLBACK_INTENT,
  FALLBACK_ACTION,
  FALLBACK_OUTCOME,
  FALLBACK_LESSON,
  DEFAULT_IMPORTANCE,
  DEFAULT_CONFIDENCE,
} from "../models/defaults.js";

function asString(val: unknown, fallback: string): string {
  if (typeof val === "string") return val.trim() || fallback;
  if (val != null) return String(val);
  return fallback;
}

export function safeExtraction(raw: Partial<EpisodeExtraction> | null | undefined): EpisodeExtraction {
  return {
    intent: asString(raw?.intent, FALLBACK_INTENT),
    action: asString(raw?.action, FALLBACK_ACTION),
    outcome: asString(raw?.outcome, FALLBACK_OUTCOME),
    lesson: asString(raw?.lesson, FALLBACK_LESSON),
    importance: typeof raw?.importance === "number" && raw.importance >= 0 && raw.importance <= 1
      ? raw.importance : DEFAULT_IMPORTANCE,
    confidence: typeof raw?.confidence === "number" && raw.confidence >= 0 && raw.confidence <= 1
      ? raw.confidence : DEFAULT_CONFIDENCE,
  };
}

export function safeReflection(raw: Partial<ReflectionOutput> | null | undefined): ReflectionOutput {
  const update = raw?.workingMemoryUpdate;
  const hasValidUpdate = update != null && typeof update === "object" && !Array.isArray(update);

  return {
    whatWorked: asString(raw?.whatWorked, "Response generated"),
    whatFailed: asString(raw?.whatFailed, "None identified"),
    lessons: asString(raw?.lessons, FALLBACK_LESSON),
    updateCandidates: asString(raw?.updateCandidates, "[]"),
    workingMemoryUpdate: hasValidUpdate
      ? {
          current_goal: typeof update.current_goal === "string" ? update.current_goal : update.current_goal === null ? null : undefined,
          current_context: typeof update.current_context === "string" ? update.current_context : undefined,
          active_hypotheses: Array.isArray(update.active_hypotheses) ? update.active_hypotheses.filter((h: unknown): h is string => typeof h === "string") : undefined,
          open_questions: Array.isArray(update.open_questions) ? update.open_questions.filter((q: unknown): q is string => typeof q === "string") : undefined,
          risk_flags: Array.isArray(update.risk_flags) ? update.risk_flags.filter((r: unknown): r is string => typeof r === "string") : undefined,
        }
      : undefined,
  };
}

export function safeConsolidation(raw: Partial<ConsolidationOutput> | null | undefined): ConsolidationOutput {
  return {
    semanticMemories: Array.isArray(raw?.semanticMemories) ? raw.semanticMemories : [],
    userModelUpdates: Array.isArray(raw?.userModelUpdates) ? raw.userModelUpdates : [],
    selfModelUpdates: Array.isArray(raw?.selfModelUpdates) ? raw.selfModelUpdates : [],
  };
}
