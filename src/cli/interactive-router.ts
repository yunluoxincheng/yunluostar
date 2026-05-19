import type { AppConfig } from "../config.js";
import { loadConfig, redactConfig, getResolvedApiKey } from "../config.js";
import { createDbConnection, closeDbConnection } from "../db/connection.js";
import { runMigrations } from "../db/migrate.js";
import { createLLMClient } from "../llm/factory.js";
import { createAgentController } from "../agent/controller.js";
import { createSemanticMemoriesRepository } from "../db/semantic-memories-repository.js";
import { createSelfModelRepository } from "../db/self-model-repository.js";
import { createGoalsRepository } from "../db/goals-repository.js";
import { createReflectionsRepository } from "../db/reflections-repository.js";

export interface InteractiveCommandResult {
  action: "chat" | "exit" | "continue" | "error";
  output?: string;
}

export class InteractiveRouter {
  private sessionId: string;
  private config: AppConfig;

  constructor(config: AppConfig, sessionId?: string) {
    this.config = config;
    this.sessionId = sessionId ?? config.defaultSessionId;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  async route(input: string): Promise<InteractiveCommandResult> {
    const trimmed = input.trim();

    if (!trimmed) {
      return { action: "continue" };
    }

    if (trimmed.startsWith("/")) {
      return this.handleSlashCommand(trimmed);
    }

    return { action: "chat", output: trimmed };
  }

  private async handleSlashCommand(input: string): Promise<InteractiveCommandResult> {
    const parts = input.split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (command) {
      case "/help":
        return { action: "continue", output: formatHelp() };
      case "/exit":
      case "/quit":
        return { action: "exit", output: "Goodbye!" };
      case "/config":
        return { action: "continue", output: formatConfig(this.config) };
      case "/model":
        return { action: "continue", output: formatModel(this.config) };
      case "/session":
        if (args.length === 0) {
          return { action: "continue", output: `Current session: ${this.sessionId}` };
        }
        this.sessionId = args[0];
        return { action: "continue", output: `Switched to session: ${this.sessionId}` };
      case "/memory":
        return { action: "continue", output: await this.inspectMemory() };
      case "/self":
        return { action: "continue", output: await this.inspectSelf() };
      case "/goals":
        return { action: "continue", output: await this.inspectGoals() };
      case "/reflections":
        return { action: "continue", output: await this.inspectReflections() };
      default:
        return { action: "error", output: `Unknown command: ${command}. Type /help for available commands.` };
    }
  }

  private async inspectMemory(): Promise<string> {
    const db = createDbConnection(this.config.databasePath);
    try {
      runMigrations(db);
      const repo = createSemanticMemoriesRepository(db);
      const items = repo.findRecent(20);
      if (items.length === 0) return "No memories yet.";
      return items.map((m) => `- [${m.category}] ${m.content.slice(0, 100)}`).join("\n");
    } finally {
      closeDbConnection(db);
    }
  }

  private async inspectSelf(): Promise<string> {
    const db = createDbConnection(this.config.databasePath);
    try {
      runMigrations(db);
      const repo = createSelfModelRepository(db);
      const items = repo.findActive();
      if (items.length === 0) return "No self model entries yet.";
      return items.map((e) => `- ${e.trait}: ${e.value}`).join("\n");
    } finally {
      closeDbConnection(db);
    }
  }

  private async inspectGoals(): Promise<string> {
    const db = createDbConnection(this.config.databasePath);
    try {
      runMigrations(db);
      const repo = createGoalsRepository(db);
      const items = repo.findActive();
      if (items.length === 0) return "No active goals.";
      return items.map((g) => `- [${g.status}] ${g.description}`).join("\n");
    } finally {
      closeDbConnection(db);
    }
  }

  private async inspectReflections(): Promise<string> {
    const db = createDbConnection(this.config.databasePath);
    try {
      runMigrations(db);
      const repo = createReflectionsRepository(db);
      const items = repo.findRecent(10);
      if (items.length === 0) return "No reflections yet.";
      return items.map((r) => `- ${(r.whatWorked ?? "").slice(0, 80)}`).join("\n");
    } finally {
      closeDbConnection(db);
    }
  }
}

function formatHelp(): string {
  return [
    "Available commands:",
    "  /help          Show this help message",
    "  /exit, /quit   Exit the interactive shell",
    "  /config        Display effective configuration (secrets redacted)",
    "  /model         Display active provider and model info",
    "  /session [id]  Show or switch the active session",
    "  /memory        Show recent semantic memories (read-only)",
    "  /self          Show active self model entries (read-only)",
    "  /goals         Show active goals (read-only)",
    "  /reflections   Show recent reflections (read-only)",
    "",
    "  Any other input is sent as a chat message.",
  ].join("\n");
}

function formatConfig(config: AppConfig): string {
  return JSON.stringify(redactConfig(config), null, 2);
}

function formatModel(config: AppConfig): string {
  const keyConfigured = getResolvedApiKey(config) ? "yes" : "no";
  return [
    `Provider:  ${config.provider}`,
    `Model:     ${config.model ?? "(default)"}`,
    `Base URL:  ${config.baseUrl ?? "(default)"}`,
    `Key:       ${keyConfigured === "yes" ? "configured" : "not configured"}`,
  ].join("\n");
}

export async function runInteractiveShell(cliOverrides?: Partial<AppConfig>): Promise<void> {
  const config = loadConfig(cliOverrides);
  const router = new InteractiveRouter(config);

  const readline = await import("node:readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "yunluo> ",
  });

  rl.prompt();

  rl.on("line", async (line: string) => {
    const result = await router.route(line);

    switch (result.action) {
      case "exit":
        console.log(result.output ?? "Goodbye!");
        rl.close();
        break;
      case "chat":
        if (result.output) {
          await processChat(result.output, router.getSessionId(), config);
        }
        rl.prompt();
        break;
      case "continue":
        if (result.output) console.log(result.output);
        rl.prompt();
        break;
      case "error":
        console.log(result.output ?? "Unknown error");
        rl.prompt();
        break;
    }
  });
}

async function processChat(message: string, sessionId: string, config: AppConfig): Promise<void> {
  const db = createDbConnection(config.databasePath);
  try {
    runMigrations(db);
    const llm = createLLMClient(config.provider, config);
    const agent = createAgentController(llm, db);
    const result = await agent.chat(message, { sessionId });
    console.log(`\nAgent: ${result.response}`);
  } finally {
    closeDbConnection(db);
  }
}
