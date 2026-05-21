import type { LLMClient } from "./client.js";
import { DeterministicLLMClient } from "./deterministic-client.js";
import { OpenAICompatibleLLMClient } from "./openai-compatible-client.js";
import type { AppConfig } from "../config.js";
import { getResolvedApiKey } from "../config.js";

export { safeExtraction, safeReflection, safeConsolidation } from "./safe-outputs.js";
export { createEmbeddingClient } from "./embedding-provider.js";

export function createLLMClient(provider: string, config?: AppConfig): LLMClient {
  switch (provider) {
    case "openai-compatible":
      if (!config) throw new Error(`Provider "${provider}" requires configuration.`);
      const apiKey = getResolvedApiKey(config);
      if (!apiKey) {
        throw new Error(
          `Provider "${provider}" requires an API key. Set apiKey or apiKeyEnv in config, ` +
          `or use the YUNLUO_API_KEY environment variable.`
        );
      }
      return new OpenAICompatibleLLMClient({
        baseUrl: config.baseUrl ?? "https://api.openai.com/v1",
        apiKey,
        model: config.model ?? "gpt-3.5-turbo",
        temperature: config.temperature,
        timeout: config.timeout,
      });
    case "deterministic":
      return new DeterministicLLMClient();
    default:
      throw new Error(`Unknown provider: "${provider}". Supported providers: deterministic, openai-compatible.`);
  }
}
