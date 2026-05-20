import { DEFAULT_EMBEDDING_DIMENSIONS } from "../memory/embedding-store.js";

export interface EmbeddingConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  dimensions?: number;
  timeout?: number;
  maxRetries?: number;
}

export interface EmbeddingClient {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

interface EmbeddingResponse {
  data?: Array<{ embedding?: number[] }>;
}

const DEFAULT_MAX_RETRIES = 2;
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class OpenAIEmbeddingClient implements EmbeddingClient {
  private readonly config: EmbeddingConfig;

  constructor(config: EmbeddingConfig) {
    this.config = config;
  }

  async embed(text: string): Promise<number[]> {
    const results = await this.embedBatch([text]);
    return results[0];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return this.executeWithRetry(() => this.request(texts));
  }

  private async request(texts: string[]): Promise<number[][]> {
    const controller = new AbortController();
    const timeoutId = this.config.timeout
      ? setTimeout(() => controller.abort(), this.config.timeout)
      : undefined;

    try {
      const response = await fetch(`${this.config.baseUrl}/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          input: texts,
          dimensions: this.config.dimensions ?? DEFAULT_EMBEDDING_DIMENSIONS,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        const error = new Error(
          `Embedding request failed: ${response.status} ${response.statusText}${body ? ` - ${body.slice(0, 200)}` : ""}`
        );
        (error as Error & { status?: number }).status = response.status;
        throw error;
      }

      const data = (await response.json()) as EmbeddingResponse;
      if (!data.data?.length) {
        throw new Error("Embedding response missing data");
      }

      return data.data.map((item) => item.embedding ?? []);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new Error(`Embedding request timed out after ${this.config.timeout}ms`);
      }
      throw err;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    const maxRetries = this.config.maxRetries ?? DEFAULT_MAX_RETRIES;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        lastError = error;

        const status = (error as Error & { status?: number }).status;
        if (attempt < maxRetries && status !== undefined && RETRYABLE_STATUS_CODES.has(status)) {
          const delay = Math.min(500 * Math.pow(2, attempt), 5_000);
          await sleep(delay);
          continue;
        }
        throw error;
      }
    }

    throw lastError ?? new Error("Embedding request failed after retries");
  }
}

export class DeterministicEmbeddingClient implements EmbeddingClient {
  private readonly dimensions: number;

  constructor(dimensions?: number) {
    this.dimensions = dimensions ?? DEFAULT_EMBEDDING_DIMENSIONS;
  }

  async embed(_text: string): Promise<number[]> {
    return new Array(this.dimensions).fill(0);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return texts.map(() => new Array(this.dimensions).fill(0));
  }
}
