import type { EpisodeExtraction, ReflectionOutput, ConsolidationOutput } from "./client.js";
import {
  FALLBACK_INTENT,
  FALLBACK_ACTION,
  FALLBACK_OUTCOME,
  FALLBACK_LESSON,
  DEFAULT_IMPORTANCE,
  DEFAULT_CONFIDENCE,
} from "../models/defaults.js";

export function safeExtraction(raw: Partial<EpisodeExtraction> | null | undefined): EpisodeExtraction {
  return {
    intent: raw?.intent?.trim() || FALLBACK_INTENT,
    action: raw?.action?.trim() || FALLBACK_ACTION,
    outcome: raw?.outcome?.trim() || FALLBACK_OUTCOME,
    lesson: raw?.lesson?.trim() || FALLBACK_LESSON,
    importance: typeof raw?.importance === "number" && raw.importance >= 0 && raw.importance <= 1
      ? raw.importance : DEFAULT_IMPORTANCE,
    confidence: typeof raw?.confidence === "number" && raw.confidence >= 0 && raw.confidence <= 1
      ? raw.confidence : DEFAULT_CONFIDENCE,
  };
}

export function safeReflection(raw: Partial<ReflectionOutput> | null | undefined): ReflectionOutput {
  return {
    whatWorked: raw?.whatWorked?.trim() || "Response generated",
    whatFailed: raw?.whatFailed?.trim() || "None identified",
    lessons: raw?.lessons?.trim() || FALLBACK_LESSON,
    updateCandidates: raw?.updateCandidates?.trim() || "[]",
  };
}

export function safeConsolidation(raw: Partial<ConsolidationOutput> | null | undefined): ConsolidationOutput {
  return {
    semanticMemories: Array.isArray(raw?.semanticMemories) ? raw.semanticMemories : [],
    userModelUpdates: Array.isArray(raw?.userModelUpdates) ? raw.userModelUpdates : [],
    selfModelUpdates: Array.isArray(raw?.selfModelUpdates) ? raw.selfModelUpdates : [],
  };
}
