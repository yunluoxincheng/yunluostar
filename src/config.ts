import { z } from "zod";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { resolve, dirname } from "node:path";

export const configSchema = z.object({
  provider: z.enum(["deterministic", "openai-compatible"]).default("deterministic"),
  baseUrl: z.string().optional(),
  apiKey: z.string().optional(),
  apiKeyEnv: z.string().optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  timeout: z.number().int().positive().optional(),
  embeddingModel: z.string().default("text-embedding-3-small"),
  embeddingDimensions: z.number().int().default(1536),
  defaultSessionId: z.string().default("default"),
  databasePath: z.string().default("data/yunluostar.db"),
});

export type AppConfig = z.infer<typeof configSchema>;

const CONFIG_DIR_NAME = ".yunluo";
const CONFIG_FILENAME = "config.json";

export function getUserConfigPath(): string {
  return resolve(homedir(), CONFIG_DIR_NAME, CONFIG_FILENAME);
}

export function getProjectConfigPath(cwd?: string): string {
  return resolve(cwd ?? process.cwd(), CONFIG_DIR_NAME, CONFIG_FILENAME);
}

function readJsonFile(filePath: string): Record<string, unknown> | null {
  try {
    if (!existsSync(filePath)) return null;
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function resolveApiKey(config: Partial<AppConfig>): string | undefined {
  if (config.apiKeyEnv) {
    const envValue = process.env[config.apiKeyEnv];
    if (envValue) return envValue;
  }
  if (config.apiKey) return config.apiKey;
  return undefined;
}

function applyEnvOverrides(partial: Partial<AppConfig>): Partial<AppConfig> {
  const env: Partial<AppConfig> = {};
  if (process.env.YUNLUO_PROVIDER) env.provider = process.env.YUNLUO_PROVIDER as AppConfig["provider"];
  if (process.env.YUNLUO_BASE_URL) env.baseUrl = process.env.YUNLUO_BASE_URL;
  if (process.env.YUNLUO_API_KEY) env.apiKey = process.env.YUNLUO_API_KEY;
  if (process.env.YUNLUO_MODEL) env.model = process.env.YUNLUO_MODEL;
  if (process.env.YUNLUO_TEMPERATURE) env.temperature = Number(process.env.YUNLUO_TEMPERATURE);
  if (process.env.YUNLUO_TIMEOUT) env.timeout = Number(process.env.YUNLUO_TIMEOUT);
  if (process.env.DATABASE_URL) env.databasePath = process.env.DATABASE_URL;
  if (process.env.LLM_PROVIDER) env.provider = process.env.LLM_PROVIDER as AppConfig["provider"];
  return { ...partial, ...env };
}

export function loadConfig(cliOverrides?: Partial<AppConfig>, cwd?: string): AppConfig {
  const userFile = readJsonFile(getUserConfigPath());
  const projectFile = readJsonFile(getProjectConfigPath(cwd));

  const merged: Record<string, unknown> = {
    ...(userFile ?? {}),
    ...(projectFile ?? {}),
  };

  let partial = configSchema.partial().parse(merged) as Partial<AppConfig>;
  partial = applyEnvOverrides(partial);
  partial = { ...partial, ...cliOverrides };

  return configSchema.parse(partial);
}

export function getResolvedApiKey(config: AppConfig): string | undefined {
  return resolveApiKey(config);
}

export function redactConfig(config: AppConfig): Record<string, unknown> {
  const result: Record<string, unknown> = { ...config };
  if (typeof config.apiKey === "string" && config.apiKey.length > 0) {
    const key = config.apiKey;
    result.apiKey = key.length <= 8 ? "****" : `${key.slice(0, 4)}${"*".repeat(key.length - 4)}`;
  }
  return result;
}

const KNOWN_CONFIG_KEYS = new Set(Object.keys(configSchema.shape));

export function writeConfig(filePath: string, updates: Partial<AppConfig>): void {
  let existing: Record<string, unknown> = {};
  if (existsSync(filePath)) {
    try {
      existing = JSON.parse(readFileSync(filePath, "utf-8")) as Record<string, unknown>;
    } catch {
      existing = {};
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) {
      delete existing[key];
    } else {
      existing[key] = value;
    }
  }

  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(filePath, JSON.stringify(existing, null, 2) + "\n", "utf-8");
}

export function validateConfigKey(key: string): boolean {
  return KNOWN_CONFIG_KEYS.has(key);
}

// Legacy compatibility
export function loadConfigLegacy(overrides?: Partial<AppConfig>): AppConfig {
  return loadConfig(overrides);
}
