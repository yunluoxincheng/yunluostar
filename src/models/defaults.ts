import { randomUUID } from "node:crypto";
import type { ChatTrace } from "./schemas.js";

export function generateId(): string {
  return randomUUID();
}

export function createDefaultTrace(episodeId: string): ChatTrace {
  return {
    episodeId,
    reflectionId: undefined,
    recalledMemoryIds: [],
    appliedUserModelIds: [],
    appliedSelfModelIds: [],
  };
}

export const DEFAULT_IMPORTANCE = 0.5;
export const DEFAULT_CONFIDENCE = 0.5;
export const FALLBACK_LESSON = "Interaction completed without specific lesson extraction.";
export const FALLBACK_INTENT = "general inquiry";
export const FALLBACK_ACTION = "responded";
export const FALLBACK_OUTCOME = "response delivered";
export const MIN_CONFIDENCE_FOR_INFLUENCE = 0.3;

export function conservativeDefaults() {
  return {
    importance: DEFAULT_IMPORTANCE,
    confidence: DEFAULT_CONFIDENCE,
    status: "active" as const,
    lesson: FALLBACK_LESSON,
  };
}
