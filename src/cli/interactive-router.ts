import type { AppConfig } from "../config.js";
import { loadConfig, redactConfig, getResolvedApiKey } from "../config.js";
import { clearAuthFile, readAuthFile, writeAuthFile } from "../auth/token-store.js";
import type { PipelineStage } from "../protocol/runtime.js";
import { createRuntimeClient } from "../runtime-client/client.js";
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
      case "/runtime":
      case "/status":
        return { action: "continue", output: await this.inspectRuntime() };
      case "/login":
        return { action: "continue", output: this.login(args[0]) };
      case "/logout":
        return { action: "continue", output: this.logout() };
      case "/permissions":
        return { action: "continue", output: formatConfigInfo({ permissionPolicy: this.config.permissionPolicy }) };
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

  private login(token?: string): string {
    if (!token) return "  usage: /login <runtime-token>";
    const auth = writeAuthFile({ runtimeUrl: this.config.runtimeUrl, token });
    return `  saved runtime token for ${auth.runtimeUrl}`;
  }

  private logout(): string {
    const removed = clearAuthFile();
    return removed ? "  removed runtime auth token" : "  no runtime auth token found";
  }

  private async inspectRuntime(): Promise<string> {
    const client = createRuntimeClient(this.config);
    const auth = readAuthFile();
    try {
      const status = await client.status();
      return [
        `  runtime: ${chalk.bold(this.config.runtimeMode)} ${chalk.dim(this.config.runtimeUrl)}`,
        `  auth: ${status.authRequired ? (auth ? chalk.green("token saved") : chalk.yellow("login required")) : chalk.dim("not required")}`,
        `  provider: ${status.provider} ${status.providerReady ? chalk.green("ready") : chalk.yellow("not configured")}`,
        `  embedding: ${status.embeddingReady ? chalk.green("ready") : chalk.yellow("unavailable")}`,
        `  storage: ${status.storage.driver} ${status.storage.ownedByRuntime ? chalk.green("runtime-owned") : chalk.red("cli-owned")}`,
      ].join("\n");
    } catch (error) {
      return [
        `  runtime unavailable: ${(error as Error).message}`,
        `  configured URL: ${this.config.runtimeUrl}`,
        "  use /config to check settings or start local runtime with: yunluo runtime serve",
      ].join("\n");
    }
  }

  private async inspectMemory(): Promise<string> {
    try {
      const result = await createRuntimeClient(this.config).listMemory();
      const items = result.items as Array<{ category?: string; content?: string }>;
      if (items.length === 0) return chalk.dim("  (no memories)");
      return items.map((m) => `  ${chalk.bold(m.category ?? "general")}  ${chalk.dim((m.content ?? "").slice(0, 80))}`).join("\n");
    } catch (error) {
      return `  runtime memory unavailable: ${(error as Error).message}`;
    }
  }

  private async inspectSelf(): Promise<string> {
    try {
      const result = await createRuntimeClient(this.config).listSelfModel();
      const items = result.items as Array<{ trait?: string; value?: string }>;
      if (items.length === 0) return chalk.dim("  (no self model entries)");
      return items.map((e) => `  ${chalk.bold(e.trait)}  ${e.value}`).join("\n");
    } catch (error) {
      return `  runtime self model unavailable: ${(error as Error).message}`;
    }
  }

  private async inspectGoals(): Promise<string> {
    try {
      const result = await createRuntimeClient(this.config).listGoals();
      const items = result.items as Array<{
        type: string;
        status: string;
        priority: number;
        requiresApproval?: boolean;
        conflictOf?: string | null;
        description: string;
      }>;
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
    } catch (error) {
      return `  runtime goals unavailable: ${(error as Error).message}`;
    }
  }

  private async inspectReflections(): Promise<string> {
    try {
      const result = await createRuntimeClient(this.config).listReflections(10);
      const items = result.items as Array<{ whatWorked?: string | null }>;
      if (items.length === 0) return chalk.dim("  (no reflections)");
      return items.map((r) => `  ${(r.whatWorked ?? "").slice(0, 80)}`).join("\n");
    } catch (error) {
      return `  runtime reflections unavailable: ${(error as Error).message}`;
    }
  }

  private async inspectWorkingMemory(): Promise<string> {
    try {
      const session = await createRuntimeClient(this.config).getSession(this.sessionId);
      if (!session.workingMemory) return chalk.dim("  (no working memory snapshot)");
      return formatWorkingMemory(session.workingMemory as {
        currentGoal: string | null;
        currentContext: string;
        activeHypotheses: readonly string[];
        openQuestions: readonly string[];
        riskFlags: readonly string[];
      });
    } catch (error) {
      return `  runtime working memory unavailable: ${(error as Error).message}`;
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
