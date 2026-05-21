import type { EmbeddingClient } from "../llm/embedding-client.js";
import { DeterministicEmbeddingClient } from "../llm/embedding-client.js";
import { createEmbeddingClient } from "../llm/factory.js";

class GracefulEmbeddingClient implements EmbeddingClient {
  private readonly fallback = new DeterministicEmbeddingClient();

  constructor(private readonly primary: EmbeddingClient) {}

  async embed(text: string): Promise<number[]> {
    try {
      return await this.primary.embed(text);
    } catch {
      return this.fallback.embed(text);
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      return await this.primary.embedBatch(texts);
    } catch {
      return this.fallback.embedBatch(texts);
    }
  }
}

export function createRuntimeEmbeddingClient(): EmbeddingClient {
  return new GracefulEmbeddingClient(createEmbeddingClient());
}
