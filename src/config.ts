import { z } from "zod";

const configSchema = z.object({
  databasePath: z.string().default("data/yunluostar.db"),
  llmProvider: z.enum(["deterministic", "openai", "claude", "qwen", "llama"]).default("deterministic"),
  defaultSessionId: z.string().default("default"),
});

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(overrides?: Partial<AppConfig>): AppConfig {
  return configSchema.parse({
    databasePath: overrides?.databasePath ?? process.env.DATABASE_URL,
    llmProvider: overrides?.llmProvider ?? process.env.LLM_PROVIDER,
    defaultSessionId: overrides?.defaultSessionId,
  });
}
