import type { EmbeddingClient } from "../llm/embedding-client.js";
import type { EmbeddingStore } from "./embedding-store.js";
import type { RelevanceScorer, ScoredItem } from "./relevance-scorer.js";

export interface CompositeScorerConfig {
  semanticWeight: number;
  importanceWeight: number;
  recencyWeight: number;
  confidenceWeight: number;
  recencyDecayLambda: number;
}

const DEFAULT_CONFIG: CompositeScorerConfig = {
  semanticWeight: 0.5,
  importanceWeight: 0.2,
  recencyWeight: 0.15,
  confidenceWeight: 0.15,
  recencyDecayLambda: 0.05,
};

export interface MemoryMetadata {
  id: string;
  content: string;
  importance: number;
  confidence: number;
  createdAt: Date;
}

function computeRecencyScore(createdAt: Date, lambda: number): number {
  const daysSince = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  return Math.exp(-lambda * daysSince);
}

export function createCompositeScorer(
  embeddingClient: EmbeddingClient,
  embeddingStore: EmbeddingStore,
  config?: Partial<CompositeScorerConfig>,
): RelevanceScorer & {
  scoreWithMetadata(input: string, memories: MemoryMetadata[]): Promise<ScoredItem[]>;
} {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  return {
    score(input, candidates) {
      throw new Error(
        "CompositeScorer.score() is not async — use scoreWithMetadata() instead. " +
        "For backward-compatible usage, use createLexicalScorer()."
      );
    },

    async scoreWithMetadata(input, memories) {
      if (memories.length === 0) return [];

      const queryEmbedding = await embeddingClient.embed(input);
      const vectorResults = embeddingStore.search(queryEmbedding, Math.min(memories.length * 2, 50));
      const vectorScores = new Map(vectorResults.map((r) => [r.id, r.score]));

      const scored = memories.map((mem) => {
        const semanticScore = vectorScores.get(mem.id) ?? 0;
        const recencyScore = computeRecencyScore(mem.createdAt, cfg.recencyDecayLambda);

        const finalScore =
          cfg.semanticWeight * semanticScore +
          cfg.importanceWeight * mem.importance +
          cfg.recencyWeight * recencyScore +
          cfg.confidenceWeight * mem.confidence;

        return {
          id: mem.id,
          content: mem.content,
          score: finalScore,
        };
      });

      return scored.sort((a, b) => b.score - a.score);
    },
  };
}

export type CompositeScorer = ReturnType<typeof createCompositeScorer>;
