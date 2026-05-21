import type { AppConfig } from "../config.js";
import { loadConfig, redactConfig, getResolvedApiKey } from "../config.js";
import { createDbConnection, closeDbConnection } from "../db/connection.js";
import { runMigrations } from "../db/migrate.js";
import type { PipelineStage } from "../agent/controller.js";
import { createSemanticMemoriesRepository } from "../db/semantic-memories-repository.js";
import { createSelfModelRepository } from "../db/self-model-repository.js";
import { createGoalsRepository } from "../db/goals-repository.js";
import { createAuditLogRepository } from "../db/audit-log-repository.js";
import { createGoalManager } from "../planning/goal-manager.js";
import { createReflectionsRepository } from "../db/reflections-repository.js";
import { createWorkingMemoryRepository } from "../db/working-memory-repository.js";
import { deserializeWorkingMemory } from "../models/working-memory.js";
import {
  formatHelp,
  formatModelInfo, formatConfigInfo, formatWorkingMemory,
} from "./tui.js";
import chalk from "chalk";
import { suggestSimilar } from "./command-registry.js";

export interface InteractiveCommandResult {
  action: "chat" | "exit" | "continue" | "error";
  output?: string;
}

export const STAGE_LABELS: Record<PipelineStage, string> = {
  restoring: "restoring working memory...",
  awakening: "awakening relevant memory...",
  thinking: "integrating context...",
  recording: "recording episode...",
  reflecting: "running metacognition...",
  consolidating: "consolidating memory...",
  correcting: "resolving correction...",
  saving: "saving working memory...",
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
      case "/wm":
        return { action: "continue", output: await this.inspectWorkingMemory() };
      default: {
        const suggestions = suggestSimilar(command);
        if (suggestions.length > 0) {
          const names = suggestions.map((s) => s.name).join(", ");
          return { action: "error", output: `Unknown command: ${command}. Did you mean: ${names}? Type /help for commands.` };
        }
        return { action: "error", output: `Unknown command: ${command}. Type /help for commands.` };
      }
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
      const auditRepo = createAuditLogRepository(db);
      const goalManager = createGoalManager(repo, auditRepo);

      // Ensure core goals are initialized
      goalManager.ensureCoreGoals();

      const items = repo.findAll();
      if (items.length === 0) return chalk.dim("  (no goals)");

      const TYPE_ORDER: Record<string, number> = {
        core: 0, long_term: 1, medium_term: 2, short_term: 3, operational: 4,
      };
      items.sort((a, b) => {
        const typeDiff = (TYPE_ORDER[a.type] ?? 99) - (TYPE_ORDER[b.type] ?? 99);
        if (typeDiff !== 0) return typeDiff;
        return b.priority - a.priority;
      });

      const STATUS_ICONS: Record<string, string> = {
        active: chalk.green("●"), suggested: chalk.yellow("○"),
        paused: chalk.gray("◷"), completed: chalk.green("✓"),
        rejected: chalk.red("✗"), deprecated: chalk.gray("—"),
      };

      const TYPE_LABELS: Record<string, string> = {
        core: "CORE", long_term: "LONG", medium_term: "MED",
        short_term: "SHORT", operational: "OPS",
      };

      const lines: string[] = [];
      let currentType = "";
      for (const g of items) {
        if (g.type !== currentType) {
          currentType = g.type;
          lines.push(`  ${chalk.bold(TYPE_LABELS[g.type] ?? g.type)}:`);
        }
        const icon = STATUS_ICONS[g.status] ?? "?";
        const approval = g.requiresApproval && g.status === "suggested" ? chalk.yellow(" [needs approval]") : "";
        const conflict = g.conflictOf ? chalk.red(` [conflict: ${g.conflictOf.slice(0, 8)}]`) : "";
        lines.push(`    ${icon} ${g.description} (${chalk.dim(`p:${g.priority.toFixed(1)}`)}${approval}${conflict})`);
      }

      return lines.join("\n");
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

  private async inspectWorkingMemory(): Promise<string> {
    const db = createDbConnection(this.config.databasePath);
    try {
      runMigrations(db);
      const repo = createWorkingMemoryRepository(db);
      const latest = repo.findLatestBySession(this.sessionId);
      if (!latest) return chalk.dim("  (no working memory snapshot)");
      const wm = deserializeWorkingMemory(latest.snapshot);
      return formatWorkingMemory(wm);
    } finally {
      closeDbConnection(db);
    }
  }
}

// ─── Interactive Shell ────────────────────────────────────────

export async function runInteractiveShell(cliOverrides?: Partial<AppConfig>): Promise<void> {
  const config = loadConfig(cliOverrides);
  const { renderTui } = await import("./tui/app.js");
  const { waitUntilExit } = renderTui(config);
  await waitUntilExit();
}
