import type { AwakenedContext } from "./memory-awakener.js";
import type { WorkingMemory } from "../models/working-memory.js";

export function buildCognitiveContext(awakened: AwakenedContext, wm?: WorkingMemory): string {
  const parts: string[] = [];

  if (awakened.recalledMemories.length > 0) {
    parts.push("Relevant memories:");
    for (const mem of awakened.recalledMemories) {
      parts.push(`- ${mem.content} (confidence: ${mem.confidence.toFixed(2)})`);
    }
  }

  if (awakened.userModelEntries.length > 0) {
    parts.push("User preferences:");
    for (const entry of awakened.userModelEntries) {
      parts.push(`- ${entry.key}: ${entry.value} (confidence: ${entry.confidence.toFixed(2)})`);
    }
  }

  if (awakened.selfModelEntries.length > 0) {
    parts.push("Self awareness:");
    for (const entry of awakened.selfModelEntries) {
      parts.push(`- ${entry.trait}: ${entry.value}`);
    }
  }

  if (wm && (wm.currentGoal || wm.currentContext || wm.activeHypotheses.length > 0 || wm.openQuestions.length > 0 || wm.riskFlags.length > 0)) {
    parts.push("Current working state:");
    if (wm.currentGoal) parts.push(`- Goal: ${wm.currentGoal}`);
    if (wm.currentContext) parts.push(`- Context: ${wm.currentContext}`);
    for (const h of wm.activeHypotheses) parts.push(`- Hypothesis: ${h}`);
    for (const q of wm.openQuestions) parts.push(`- Open question: ${q}`);
    for (const r of wm.riskFlags) parts.push(`- Risk: ${r}`);
  }

  return parts.join("\n");
}
