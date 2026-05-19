import type { LLMClient, EpisodeExtraction, ReflectionOutput, ConsolidationOutput } from "./client.js";
import { safeExtraction, safeReflection, safeConsolidation } from "./safe-outputs.js";

interface OpenAICompatibleConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature?: number;
  timeout?: number;
  maxRetries?: number;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: { content?: string };
    delta?: { content?: string };
  }>;
}

const DEFAULT_MAX_RETRIES = 3;
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryableError(err: Error): boolean {
  if (err.message.includes("401") || err.message.includes("403")) return false;
  return true;
}

export class OpenAICompatibleLLMClient implements LLMClient {
  private readonly config: OpenAICompatibleConfig;

  constructor(config: OpenAICompatibleConfig) {
    this.config = config;
  }

  async generateResponse(context: string, userInput: string, onToken?: (token: string) => void): Promise<string> {
    const messages: ChatMessage[] = [];
    if (context.trim()) {
      messages.push({ role: "system", content: context });
    }
    messages.push({ role: "user", content: userInput });

    if (onToken) {
      return this.executeWithRetry(() => this.streamingRequest(messages, onToken));
    }

    const data = await this.executeWithRetry(() => this.jsonRequest(messages));
    return data?.choices?.[0]?.message?.content?.trim() ?? "No response generated.";
  }

  async extractEpisode(userInput: string, agentResponse: string): Promise<EpisodeExtraction> {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content:
          "Extract a structured episode from this interaction. " +
          'Respond with valid JSON only: {"intent":"...","action":"...","outcome":"...","lesson":"...","importance":0.0-1.0,"confidence":0.0-1.0}',
      },
      { role: "user", content: `User: ${userInput}\nAgent: ${agentResponse}` },
    ];
    const data = await this.executeWithRetry(() => this.jsonRequest(messages));
    return safeExtraction(parseJsonPartial(data?.choices?.[0]?.message?.content));
  }

  async reflect(userInput: string, agentResponse: string, context: string): Promise<ReflectionOutput> {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content:
          "Reflect on this interaction. " +
          'Respond with valid JSON only: {"whatWorked":"...","whatFailed":"...","lessons":"...","updateCandidates":"..."}',
      },
      {
        role: "user",
        content: `User: ${userInput}\nAgent: ${agentResponse}\nContext: ${context}`,
      },
    ];
    const data = await this.executeWithRetry(() => this.jsonRequest(messages));
    return safeReflection(parseJsonPartial(data?.choices?.[0]?.message?.content));
  }

  async consolidate(episode: EpisodeExtraction, reflection: ReflectionOutput): Promise<ConsolidationOutput> {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content:
          "Consolidate this episode and reflection into semantic memories and model updates. " +
          'Respond with valid JSON only: {"semanticMemories":[{"content":"...","category":"...","importance":0.0-1.0,"confidence":0.0-1.0}],"userModelUpdates":[{"key":"...","value":"...","evidence":"...","confidence":0.0-1.0}],"selfModelUpdates":[{"trait":"...","value":"...","evidence":"...","confidence":0.0-1.0,"mutable":true}]}',
      },
      {
        role: "user",
        content: `Episode: ${JSON.stringify(episode)}\nReflection: ${JSON.stringify(reflection)}`,
      },
    ];
    const data = await this.executeWithRetry(() => this.jsonRequest(messages));
    return safeConsolidation(parseJsonPartial(data?.choices?.[0]?.message?.content));
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

        if (attempt < maxRetries && isRetryableError(error)) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10_000);
          await sleep(delay);
          continue;
        }
        throw error;
      }
    }

    throw lastError ?? new Error("LLM request failed after retries");
  }

  private async jsonRequest(messages: ChatMessage[]): Promise<ChatCompletionResponse> {
    const controller = new AbortController();
    const timeoutId = this.config.timeout
      ? setTimeout(() => controller.abort(), this.config.timeout)
      : undefined;

    try {
      const response = await this.fetch(messages, false, controller.signal);

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`LLM request failed: ${response.status} ${response.statusText}${body ? ` - ${body.slice(0, 200)}` : ""}`);
      }

      return (await response.json()) as ChatCompletionResponse;
    } catch (err) {
      throw this.wrapIfAbort(err);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  private async streamingRequest(messages: ChatMessage[], onToken: (token: string) => void): Promise<string> {
    const controller = new AbortController();
    const timeoutId = this.config.timeout
      ? setTimeout(() => controller.abort(), (this.config.timeout ?? 60_000) * 3)
      : undefined;

    try {
      const response = await this.fetch(messages, true, controller.signal);

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`LLM request failed: ${response.status} ${response.statusText}${body ? ` - ${body.slice(0, 200)}` : ""}`);
      }

      const fullText = await this.readSSE(response, onToken);
      return fullText.trim() || "No response generated.";
    } catch (err) {
      throw this.wrapIfAbort(err);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  private async fetch(messages: ChatMessage[], stream: boolean, signal: AbortSignal): Promise<Response> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        ...(stream ? { stream: true } : {}),
        ...(this.config.temperature !== undefined ? { temperature: this.config.temperature } : {}),
      }),
      signal,
    });
    return response;
  }

  private wrapIfAbort(err: unknown): Error {
    if (err instanceof DOMException && err.name === "AbortError") {
      return new Error(`LLM request timed out after ${this.config.timeout}ms`);
    }
    if (err instanceof Error && !err.message.startsWith("LLM request")) {
      return new Error(`LLM request failed: ${err.message}`);
    }
    return err instanceof Error ? err : new Error(String(err));
  }

  private async readSSE(response: Response, onToken: (token: string) => void): Promise<string> {
    const body = response.body;
    if (!body) throw new Error("Streaming response has no body");

    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]") continue;
          if (!trimmed.startsWith("data: ")) continue;

          const jsonStr = trimmed.slice(6);
          try {
            const parsed = JSON.parse(jsonStr) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              onToken(content);
            }
          } catch {
            // Skip malformed SSE lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullText;
  }
}

function parseJsonPartial(text: string | undefined): Record<string, unknown> | null {
  if (!text) return null;
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    return null;
  }
}
