import type { EmbeddingClient } from "./embedding-client.js";
import { OpenAIEmbeddingClient, DeterministicEmbeddingClient } from "./embedding-client.js";

const EMBEDDING_API_KEY = process.env.YUNLUO_EMBEDDING_API_KEY ?? "";
const EMBEDDING_BASE_URL = process.env.YUNLUO_EMBEDDING_BASE_URL ?? "https://open.bigmodel.cn/api/paas/v4";
const EMBEDDING_MODEL = process.env.YUNLUO_EMBEDDING_MODEL ?? "embedding-3";
const EMBEDDING_DIMENSIONS = Number(process.env.YUNLUO_EMBEDDING_DIMENSIONS) || 2048;

export function createEmbeddingClient(): EmbeddingClient {
  if (EMBEDDING_API_KEY) {
    return new OpenAIEmbeddingClient({
      baseUrl: EMBEDDING_BASE_URL,
      apiKey: EMBEDDING_API_KEY,
      model: EMBEDDING_MODEL,
      dimensions: EMBEDDING_DIMENSIONS,
    });
  }
  return new DeterministicEmbeddingClient();
}
