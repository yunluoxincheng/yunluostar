import { describe, it, expect } from "vitest";
import { createCompositeScorer } from "../../src/memory/composite-scorer.js";
import { DeterministicEmbeddingClient } from "../../src/llm/embedding-client.js";
import type { EmbeddingStore, SearchResult } from "../../src/memory/embedding-store.js";

function createMockEmbeddingStore(searchResults: Map<string, number>): EmbeddingStore {
  return {
    upsert() {},
    upsertBatch() {},
    remove() {},
    search(_query, topK): SearchResult[] {
      const all = Array.from(searchResults.entries()).map(([id, score]) => ({ id, score }));
      return all.slice(0, topK);
    },
  };
}

describe("CompositeScorer", () => {
  it("combines semantic similarity with importance, recency, and confidence", async () => {
    const client = new DeterministicEmbeddingClient(4);
    const searchResults = new Map([
      ["mem-1", 0.9],
      ["mem-2", 0.3],
    ]);
    const store = createMockEmbeddingStore(searchResults);
    const scorer = createCompositeScorer(client, store, {
      semanticWeight: 0.5,
      importanceWeight: 0.2,
      recencyWeight: 0.15,
      confidenceWeight: 0.15,
      recencyDecayLambda: 0,
    });

    const memories = [
      {
        id: "mem-1", content: "Important memory", importance: 0.9, confidence: 0.9,
        createdAt: new Date(),
      },
      {
        id: "mem-2", content: "Less important", importance: 0.3, confidence: 0.5,
        createdAt: new Date(),
      },
    ];

    const results = await scorer.scoreWithMetadata("test query", memories);
    expect(results).toHaveLength(2);
    expect(results[0].id).toBe("mem-1");
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it("gives non-zero score even without semantic match due to other dimensions", async () => {
    const client = new DeterministicEmbeddingClient(4);
    const store = createMockEmbeddingStore(new Map());
    const scorer = createCompositeScorer(client, store, {
      semanticWeight: 0.5,
      importanceWeight: 0.2,
      recencyWeight: 0.15,
      confidenceWeight: 0.15,
      recencyDecayLambda: 0,
    });

    const memories = [
      {
        id: "mem-1", content: "Important", importance: 0.9, confidence: 0.8,
        createdAt: new Date(),
      },
    ];

    const results = await scorer.scoreWithMetadata("test", memories);
    expect(results).toHaveLength(1);
    expect(results[0].score).toBeGreaterThan(0);
  });

  it("returns empty array for empty input", async () => {
    const client = new DeterministicEmbeddingClient(4);
    const store = createMockEmbeddingStore(new Map());
    const scorer = createCompositeScorer(client, store);

    const results = await scorer.scoreWithMetadata("test", []);
    expect(results).toHaveLength(0);
  });

  it("throws when calling sync score()", () => {
    const client = new DeterministicEmbeddingClient(4);
    const store = createMockEmbeddingStore(new Map());
    const scorer = createCompositeScorer(client, store);

    expect(() => scorer.score("test", [])).toThrow("scoreWithMetadata");
  });
});
