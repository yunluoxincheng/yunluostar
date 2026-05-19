import type { LLMClient, EpisodeExtraction, ReflectionOutput, ConsolidationOutput } from "./client.js";

export class DeterministicLLMClient implements LLMClient {
  async generateResponse(context: string, userInput: string): Promise<string> {
    const contextParts: string[] = [];
    if (context.trim()) {
      contextParts.push(`[Context: ${context}]`);
    }
    contextParts.push(`Response to: ${userInput}`);
    return contextParts.join(" ");
  }

  async extractEpisode(userInput: string, agentResponse: string): Promise<EpisodeExtraction> {
    return {
      intent: "general inquiry",
      action: "responded",
      outcome: "response delivered",
      lesson: `User asked about: ${userInput.slice(0, 80)}`,
      importance: 0.5,
      confidence: 0.5,
    };
  }

  async reflect(userInput: string, agentResponse: string, _context: string): Promise<ReflectionOutput> {
    return {
      whatWorked: "Response was generated successfully",
      whatFailed: "No specific failure identified",
      lessons: `Interaction about: ${userInput.slice(0, 60)}`,
      updateCandidates: "[]",
    };
  }

  async consolidate(episode: EpisodeExtraction, reflection: ReflectionOutput): Promise<ConsolidationOutput> {
    const memories: ConsolidationOutput["semanticMemories"] = [];
    const userModelUpdates: ConsolidationOutput["userModelUpdates"] = [];
    const selfModelUpdates: ConsolidationOutput["selfModelUpdates"] = [];

    const inputLower = episode.intent.toLowerCase() + " " + reflection.lessons.toLowerCase();

    if (inputLower.includes("prefer") || inputLower.includes("like") || inputLower.includes("want")) {
      userModelUpdates.push({
        key: "preference",
        value: reflection.lessons,
        evidence: `User stated preference in interaction`,
        confidence: 0.7,
      });
    }

    if (episode.importance > 0.6) {
      memories.push({
        content: episode.lesson,
        category: "general",
        importance: episode.importance,
        confidence: episode.confidence,
      });
    }

    return { semanticMemories: memories, userModelUpdates, selfModelUpdates };
  }
}
