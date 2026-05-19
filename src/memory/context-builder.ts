import type { AwakenedContext } from "./memory-awakener.js";

export function buildCognitiveContext(awakened: AwakenedContext): string {
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

  return parts.join("\n");
}
