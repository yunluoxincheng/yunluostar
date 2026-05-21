import type { EmbeddingClient } from "./embedding-client.js";
import { DeterministicEmbeddingClient } from "./embedding-client.js";

const PROXY_URL = process.env.YUNLUO_EMBEDDING_PROXY ?? "";
const ACCESS_TOKEN = process.env.YUNLUO_EMBEDDING_TOKEN ?? "";

class ProxyEmbeddingClient implements EmbeddingClient {
  private readonly proxyUrl: string;
  private readonly token: string;

  constructor(proxyUrl: string, token: string) {
    this.proxyUrl = proxyUrl;
    this.token = token;
  }

  async embed(text: string): Promise<number[]> {
    const results = await this.embedBatch([text]);
    return results[0];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;

    const response = await fetch(this.proxyUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ texts }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Embedding proxy error: ${response.status} ${body.slice(0, 200)}`);
    }

    const data = (await response.json()) as { data: number[][] };
    return data.data;
  }
}

export function createEmbeddingClient(): EmbeddingClient {
  if (PROXY_URL) {
    return new ProxyEmbeddingClient(PROXY_URL, ACCESS_TOKEN);
  }
  return new DeterministicEmbeddingClient();
}
