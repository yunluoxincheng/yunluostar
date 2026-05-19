import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import {
  loadConfig,
  redactConfig,
  getResolvedApiKey,
  validateConfigKey,
  writeConfig,
  configSchema,
  getUserConfigPath,
  getProjectConfigPath,
} from "../../src/config.js";

const TMP_DIR = resolve(tmpdir(), `yunluo-config-test-${Date.now()}`);

beforeEach(() => {
  mkdirSync(TMP_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
});

describe("configSchema", () => {
  it("applies defaults for missing fields", () => {
    const config = configSchema.parse({});
    expect(config.provider).toBe("deterministic");
    expect(config.defaultSessionId).toBe("default");
    expect(config.databasePath).toBe("data/yunluostar.db");
  });

  it("accepts all supported providers", () => {
    for (const provider of ["deterministic", "openai-compatible"]) {
      const config = configSchema.parse({ provider });
      expect(config.provider).toBe(provider);
    }
  });

  it("rejects invalid provider", () => {
    expect(() => configSchema.parse({ provider: "invalid" })).toThrow();
  });

  it("accepts optional fields", () => {
    const config = configSchema.parse({
      baseUrl: "https://api.example.com/v1",
      apiKeyEnv: "MY_KEY",
      model: "gpt-4",
      temperature: 0.5,
      timeout: 10000,
    });
    expect(config.baseUrl).toBe("https://api.example.com/v1");
    expect(config.model).toBe("gpt-4");
  });
});

describe("loadConfig", () => {
  it("returns defaults when no config files exist", () => {
    const config = loadConfig(undefined, TMP_DIR);
    expect(config.provider).toBe("deterministic");
  });

  it("loads project config", () => {
    const configDir = resolve(TMP_DIR, ".yunluo");
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      resolve(configDir, "config.json"),
      JSON.stringify({ provider: "openai-compatible", model: "gpt-4" })
    );
    const config = loadConfig(undefined, TMP_DIR);
    expect(config.provider).toBe("openai-compatible");
    expect(config.model).toBe("gpt-4");
  });

  it("project config overrides user config", () => {
    const userDir = resolve(TMP_DIR, "user-home", ".yunluo");
    const projectDir = resolve(TMP_DIR, ".yunluo");
    mkdirSync(userDir, { recursive: true });
    mkdirSync(projectDir, { recursive: true });
    writeFileSync(resolve(userDir, "config.json"), JSON.stringify({ model: "user-model" }));
    writeFileSync(resolve(projectDir, "config.json"), JSON.stringify({ model: "project-model" }));

    const origHome = process.env.HOME;
    process.env.HOME = resolve(TMP_DIR, "user-home");
    try {
      const config = loadConfig(undefined, TMP_DIR);
      expect(config.model).toBe("project-model");
    } finally {
      process.env.HOME = origHome;
    }
  });

  it("env overrides config files", () => {
    const configDir = resolve(TMP_DIR, ".yunluo");
    mkdirSync(configDir, { recursive: true });
    writeFileSync(resolve(configDir, "config.json"), JSON.stringify({ model: "file-model" }));

    process.env.YUNLUO_MODEL = "env-model";
    try {
      const config = loadConfig(undefined, TMP_DIR);
      expect(config.model).toBe("env-model");
    } finally {
      delete process.env.YUNLUO_MODEL;
    }
  });

  it("CLI overrides override env and files", () => {
    process.env.YUNLUO_MODEL = "env-model";
    try {
      const config = loadConfig({ model: "cli-model" }, TMP_DIR);
      expect(config.model).toBe("cli-model");
    } finally {
      delete process.env.YUNLUO_MODEL;
    }
  });

  it("handles missing config files gracefully", () => {
    const config = loadConfig(undefined, TMP_DIR);
    expect(config).toBeDefined();
    expect(config.provider).toBe("deterministic");
  });
});

describe("getResolvedApiKey", () => {
  it("returns apiKeyEnv value when env is set", () => {
    process.env.TEST_API_KEY = "secret123";
    try {
      const key = getResolvedApiKey({ apiKeyEnv: "TEST_API_KEY" } as any);
      expect(key).toBe("secret123");
    } finally {
      delete process.env.TEST_API_KEY;
    }
  });

  it("returns literal apiKey when no env var", () => {
    const key = getResolvedApiKey({ apiKey: "literal-key" } as any);
    expect(key).toBe("literal-key");
  });

  it("prefers apiKeyEnv over literal apiKey", () => {
    process.env.TEST_API_KEY = "env-key";
    try {
      const key = getResolvedApiKey({ apiKeyEnv: "TEST_API_KEY", apiKey: "literal-key" } as any);
      expect(key).toBe("env-key");
    } finally {
      delete process.env.TEST_API_KEY;
    }
  });

  it("returns undefined when no key configured", () => {
    const key = getResolvedApiKey({} as any);
    expect(key).toBeUndefined();
  });
});

describe("redactConfig", () => {
  it("redacts literal API keys", () => {
    const redacted = redactConfig({
      provider: "openai-compatible",
      apiKey: "sk-1234567890abcdef",
      defaultSessionId: "default",
      databasePath: "data/yunluostar.db",
    } as any);
    expect(redacted.apiKey).toBe(`sk-1${"*".repeat("sk-1234567890abcdef".length - 4)}`);
    expect(redacted.provider).toBe("openai-compatible");
  });

  it("handles short keys", () => {
    const redacted = redactConfig({
      apiKey: "abc",
      defaultSessionId: "default",
      databasePath: "data/yunluostar.db",
      provider: "deterministic",
    } as any);
    expect(redacted.apiKey).toBe("****");
  });

  it("does not redact when no apiKey present", () => {
    const redacted = redactConfig({
      provider: "deterministic",
      defaultSessionId: "default",
      databasePath: "data/yunluostar.db",
    } as any);
    expect(redacted.apiKey).toBeUndefined();
  });
});

describe("validateConfigKey", () => {
  it("accepts known keys", () => {
    expect(validateConfigKey("provider")).toBe(true);
    expect(validateConfigKey("model")).toBe(true);
    expect(validateConfigKey("apiKey")).toBe(true);
    expect(validateConfigKey("apiKeyEnv")).toBe(true);
  });

  it("rejects unknown keys", () => {
    expect(validateConfigKey("unknown")).toBe(false);
    expect(validateConfigKey("foo")).toBe(false);
  });
});

describe("writeConfig", () => {
  it("writes new config file", () => {
    const filePath = resolve(TMP_DIR, ".yunluo", "config.json");
    writeConfig(filePath, { provider: "openai-compatible", model: "gpt-4" });

    const content = JSON.parse(require("fs").readFileSync(filePath, "utf-8"));
    expect(content.provider).toBe("openai-compatible");
    expect(content.model).toBe("gpt-4");
  });

  it("preserves existing fields", () => {
    const filePath = resolve(TMP_DIR, ".yunluo", "config.json");
    mkdirSync(resolve(TMP_DIR, ".yunluo"), { recursive: true });
    writeFileSync(filePath, JSON.stringify({ provider: "deterministic", customField: "keep-me" }));

    writeConfig(filePath, { model: "gpt-4" });
    const content = JSON.parse(require("fs").readFileSync(filePath, "utf-8"));
    expect(content.model).toBe("gpt-4");
    expect(content.customField).toBe("keep-me");
  });
});

describe("path resolution", () => {
  it("getUserConfigPath returns a path under home dir", () => {
    const path = getUserConfigPath();
    expect(path).toContain(".yunluo");
    expect(path).toContain("config.json");
  });

  it("getProjectConfigPath returns a path under cwd", () => {
    const path = getProjectConfigPath("/tmp/myproject");
    expect(path).toMatch(/myproject[\\/]\.yunluo[\\/]config\.json$/);
  });
});
