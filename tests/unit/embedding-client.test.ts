import { describe, it, expect } from "vitest";
import { DeterministicEmbeddingClient } from "../../src/llm/embedding-client.js";

describe("DeterministicEmbeddingClient", () => {
  it("returns zero vector of default dimensions", async () => {
    const client = new DeterministicEmbeddingClient();
    const result = await client.embed("hello world");
    expect(result).toHaveLength(1536);
    expect(result.every((v) => v === 0)).toBe(true);
  });

  it("returns zero vector of custom dimensions", async () => {
    const client = new DeterministicEmbeddingClient(512);
    const result = await client.embed("hello world");
    expect(result).toHaveLength(512);
    expect(result.every((v) => v === 0)).toBe(true);
  });

  it("returns correct batch size", async () => {
    const client = new DeterministicEmbeddingClient(4);
    const results = await client.embedBatch(["hello", "world", "test"]);
    expect(results).toHaveLength(3);
    for (const embedding of results) {
      expect(embedding).toHaveLength(4);
      expect(embedding.every((v) => v === 0)).toBe(true);
    }
  });
});
