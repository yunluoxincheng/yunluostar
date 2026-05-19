import type { AppConfig } from "../config.js";
import { loadConfig, redactConfig, getResolvedApiKey } from "../config.js";
import { createDbConnection, closeDbConnection } from "../db/connection.js";
import { runMigrations } from "../db/migrate.js";
import { createLLMClient } from "../llm/factory.js";
import { createAgentController } from "../agent/controller.js";
import type { PipelineStage } from "../agent/controller.js";
import { createSemanticMemoriesRepository } from "../db/semantic-memories-repository.js";
import { createSelfModelRepository } from "../db/self-model-repository.js";
import { createGoalsRepository } from "../db/goals-repository.js";
import { createReflectionsRepository } from "../db/reflections-repository.js";
import {
  banner, promptStr, responsePrefix, responseContinue,
  formatResponse, footerLine, renderMarkdown,
  createSpinner, formatTrace, formatHelp, formatError,
  formatModelInfo, formatConfigInfo,
} from "./tui.js";
import chalk from "chalk";

export interface InteractiveCommandResult {
  action: "chat" | "exit" | "continue" | "error";
  output?: string;
}

const STAGE_LABELS: Record<PipelineStage, string> = {
  awakening: "awakening...",
  thinking: "thinking...",
  recording: "recording...",
  reflecting: "reflecting...",
  consolidating: "consolidating...",
  correcting: "resolving...",
  done: "",
};

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
    if (!trimmed) return { action: "continue" };
    if (trimmed.startsWith("/")) return this.handleSlashCommand(trimmed);
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
        return { action: "exit" };
      case "/config":
        return { action: "continue", output: formatConfigInfo(redactConfig(this.config)) };
      case "/model":
        return { action: "continue", output: formatModelInfo({
          provider: this.config.provider,
          model: this.config.model,
          baseUrl: this.config.baseUrl,
          apiKeyResolved: !!getResolvedApiKey(this.config),
        }) };
      case "/session":
        if (args.length === 0) {
          return { action: "continue", output: `  session: ${chalk.bold(this.sessionId)}` };
        }
        this.sessionId = args[0];
        return { action: "continue", output: `  switched to: ${chalk.bold(this.sessionId)}` };
      case "/memory":
        return { action: "continue", output: await this.inspectMemory() };
      case "/self":
        return { action: "continue", output: await this.inspectSelf() };
      case "/goals":
        return { action: "continue", output: await this.inspectGoals() };
      case "/reflections":
        return { action: "continue", output: await this.inspectReflections() };
      default:
        return { action: "error", output: `Unknown command: ${command}. Type /help for commands.` };
    }
  }

  private async inspectMemory(): Promise<string> {
    const db = createDbConnection(this.config.databasePath);
    try {
      runMigrations(db);
      const repo = createSemanticMemoriesRepository(db);
      const items = repo.findRecent(20);
      if (items.length === 0) return chalk.dim("  (no memories)");
      return items.map((m) => `  ${chalk.bold(m.category ?? "general")}  ${chalk.dim(m.content.slice(0, 80))}`).join("\n");
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
      if (items.length === 0) return chalk.dim("  (no self model entries)");
      return items.map((e) => `  ${chalk.bold(e.trait)}  ${e.value}`).join("\n");
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
      if (items.length === 0) return chalk.dim("  (no active goals)");
      return items.map((g) => `  ${chalk.bold(`[${g.status}]`)}  ${g.description}`).join("\n");
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
      if (items.length === 0) return chalk.dim("  (no reflections)");
      return items.map((r) => `  ${(r.whatWorked ?? "").slice(0, 80)}`).join("\n");
    } finally {
      closeDbConnection(db);
    }
  }
}

// ─── Interactive Shell ────────────────────────────────────────

export async function runInteractiveShell(cliOverrides?: Partial<AppConfig>): Promise<void> {
  const config = loadConfig(cliOverrides);
  const router = new InteractiveRouter(config);
  const modelLabel = config.model ?? config.provider;

  console.log(banner("0.1.0", config.provider, config.model ?? "default"));
  console.log(chalk.dim("  Type /help for commands · /exit to quit"));
  console.log("");

  const readline = await import("node:readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: promptStr(),
    historySize: 100,
    removeHistoryDuplicates: true,
  });

  rl.on("SIGINT", () => {
    console.log(chalk.dim("\n  Bye.\n"));
    rl.close();
    process.exit(0);
  });

  rl.prompt();

  rl.on("line", async (line: string) => {
    const result = await router.route(line);

    switch (result.action) {
      case "exit":
        console.log(chalk.dim("  Bye."));
        rl.close();
        break;
      case "chat":
        if (result.output) {
          await processChat(result.output, router.getSessionId(), config, modelLabel);
        }
        rl.prompt();
        break;
      case "continue":
        if (result.output) console.log(result.output);
        console.log("");
        rl.prompt();
        break;
      case "error":
        console.log(formatError(result.output ?? "Unknown error"));
        console.log("");
        rl.prompt();
        break;
    }
  });
}

async function processChat(
  message: string,
  sessionId: string,
  config: AppConfig,
  modelLabel: string,
): Promise<void> {
  const spinner = createSpinner();
  let responseStarted = false;

  const db = createDbConnection(config.databasePath);
  try {
    runMigrations(db);
    const llm = createLLMClient(config.provider, config);
    const agent = createAgentController(llm, db);

    let firstToken = true;

    const result = await agent.chat(message, {
      sessionId,
      onToken: (token: string) => {
        if (firstToken) {
          spinner.stop();
          firstToken = false;
          responseStarted = true;
          process.stdout.write(responsePrefix());
        }
        process.stdout.write(token);
      },
      onStage: (stage: PipelineStage) => {
        if (responseStarted) return;
        const label = STAGE_LABELS[stage];
        if (label) spinner.start(label);
      },
    });

    if (!responseStarted) {
      spinner.stop();
      const rendered = renderMarkdown(result.response);
      console.log(responsePrefix() + formatResponse(rendered));
    } else {
      process.stdout.write("\n");
    }

    // Compact trace + footer
    const trace = formatTrace(result.trace);
    if (trace) console.log(trace);
    console.log(footerLine(modelLabel, sessionId));
    console.log("");
  } catch (err) {
    spinner.stop();
    console.log(formatError((err as Error).message));
    console.log("");
  } finally {
    closeDbConnection(db);
  }
}
