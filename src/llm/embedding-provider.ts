import type { EmbeddingClient } from "./embedding-client.js";
import { DeterministicEmbeddingClient } from "./embedding-client.js";

const DEFAULT_PROXY_TIMEOUT_MS = 10_000;

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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_PROXY_TIMEOUT_MS);

    try {
      const response = await fetch(this.proxyUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ texts }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Embedding proxy error: ${response.status} ${body.slice(0, 200)}`);
      }

      const data = (await response.json()) as { data: number[][] };
      return data.data;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function hasConfiguredProxy(): boolean {
  const proxyUrl = process.env.YUNLUO_EMBEDDING_PROXY ?? "";
  if (!proxyUrl) return false;
  if (proxyUrl.includes("your-project.vercel.app")) return false;
  if ((process.env.YUNLUO_EMBEDDING_TOKEN ?? "") === "your-access-token") return false;
  return true;
}

export function createEmbeddingClient(): EmbeddingClient {
  if (hasConfiguredProxy()) {
    return new ProxyEmbeddingClient(
      process.env.YUNLUO_EMBEDDING_PROXY ?? "",
      process.env.YUNLUO_EMBEDDING_TOKEN ?? "",
    );
  }
  return new DeterministicEmbeddingClient();
}
