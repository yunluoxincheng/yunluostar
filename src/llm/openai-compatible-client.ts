import type { LLMClient, EpisodeExtraction, ReflectionOutput, ConsolidationOutput } from "./client.js";
import { safeExtraction, safeReflection, safeConsolidation } from "./safe-outputs.js";

interface OpenAICompatibleConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature?: number;
  timeout?: number;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: { content?: string };
  }>;
}

export class OpenAICompatibleLLMClient implements LLMClient {
  private readonly config: OpenAICompatibleConfig;

  constructor(config: OpenAICompatibleConfig) {
    this.config = config;
  }

  async generateResponse(context: string, userInput: string): Promise<string> {
    const messages: ChatMessage[] = [];
    if (context.trim()) {
      messages.push({ role: "system", content: context });
    }
    messages.push({ role: "user", content: userInput });
    const data = await this.request(messages);
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
    const data = await this.request(messages);
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
    const data = await this.request(messages);
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
    const data = await this.request(messages);
    return safeConsolidation(parseJsonPartial(data?.choices?.[0]?.message?.content));
  }

  private async request(messages: ChatMessage[]): Promise<ChatCompletionResponse> {
    const controller = new AbortController();
    const timeoutId = this.config.timeout
      ? setTimeout(() => controller.abort(), this.config.timeout)
      : undefined;

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          ...(this.config.temperature !== undefined ? { temperature: this.config.temperature } : {}),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`LLM request failed: ${response.status} ${response.statusText}${body ? ` - ${body.slice(0, 200)}` : ""}`);
      }

      return (await response.json()) as ChatCompletionResponse;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new Error(`LLM request timed out after ${this.config.timeout}ms`);
      }
      if (err instanceof Error && err.message.startsWith("LLM request")) throw err;
      throw new Error(`LLM request failed: ${(err as Error).message}`);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
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
