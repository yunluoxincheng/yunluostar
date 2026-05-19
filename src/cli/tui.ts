import chalk from "chalk";
import ora, { type Ora } from "ora";
import { resolve } from "node:path";

// ─── Color theme (restrained, like Codex) ────────────────────

const dim = chalk.dim;
const bold = chalk.bold;
const cyan = chalk.cyan;
const gray = chalk.gray;
const green = chalk.green;
const red = chalk.red;
const yellow = chalk.yellow;

// ─── Box drawing ──────────────────────────────────────────────

function termWidth(): number {
  return process.stdout.columns || 80;
}

function padRight(text: string, width: number): string {
  const visibleLen = stripAnsi(text).length;
  return text + " ".repeat(Math.max(0, width - visibleLen));
}

function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

// ─── Banner (Codex-style box) ────────────────────────────────

export function banner(version: string, provider: string, model: string): string {
  const cwd = process.cwd();
  const innerWidth = Math.min(termWidth(), 58) - 2;
  const lines: string[] = [];

  const title = `>_ yunluostar (v${version})`;
  lines.push(padRight(title, innerWidth));
  lines.push(padRight("", innerWidth));

  const providerStr = model === "default"
    ? provider
    : `${provider} / ${model}`;
  lines.push(padRight(`  model:     ${providerStr}`, innerWidth));
  lines.push(padRight(`  directory: ${cwd}`, innerWidth));
  lines.push(padRight(`  session:   default   /session to change`, innerWidth));

  const top = `╭${"─".repeat(innerWidth + 2)}╮`;
  const mid = lines.map(l => `│ ${padRight(l, innerWidth)} │`);
  const bot = `╰${"─".repeat(innerWidth + 2)}╯`;

  return [dim(top), ...mid.map(l => dim(l)), dim(bot)].join("\n");
}

// ─── Prompt ───────────────────────────────────────────────────

export function promptStr(): string {
  return bold("› ");
}

// ─── Response rendering ──────────────────────────────────────

export function responsePrefix(): string {
  return "\n• ";
}

export function responseContinue(): string {
  return "  ";
}

export function formatResponse(text: string): string {
  return text.split("\n").join("\n" + responseContinue());
}

// ─── Footer line ─────────────────────────────────────────────

export function footerLine(model: string, sessionId: string): string {
  return dim(`  ${model} · ${sessionId}`);
}

// ─── Divider ──────────────────────────────────────────────────

export function divider(): string {
  return dim("");
}

// ─── Markdown renderer (minimal) ─────────────────────────────

export function renderMarkdown(text: string): string {
  let r = text;
  r = r.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, _lang: string, code: string) => {
    return "\n" + code.trimEnd().split("\n").map(l => dim("    " + l)).join("\n") + "\n";
  });
  r = r.replace(/`([^`]+)`/g, (_m, code: string) => bold(code));
  r = r.replace(/\*\*([^*]+)\*\*/g, (_m, t: string) => bold(t));
  r = r.replace(/^#{1,3}\s+(.+)$/gm, (_m, t: string) => bold(t));
  r = r.replace(/^(\s*)[-*]\s+/gm, (_m, indent: string) => indent + dim("• "));
  r = r.replace(/^(\s*)(\d+)\.\s+/gm, (_m, indent: string, num: string) => indent + bold(num + "."));
  return r;
}

// ─── Spinner (used only for pre-response stages) ─────────────

export interface PipelineSpinner {
  start(text: string): void;
  stop(): void;
}

export function createSpinner(): PipelineSpinner {
  let sp: Ora | null = null;
  return {
    start(text: string) {
      if (sp) sp.stop();
      sp = ora({ text: dim(text), color: "gray" }).start();
    },
    stop() {
      if (sp) { sp.stop(); sp = null; }
    },
  };
}

// ─── Trace (compact, only shown for non-empty items) ─────────

export function formatTrace(trace: {
  episodeId: string;
  reflectionId?: string;
  recalledMemoryIds: string[];
  appliedUserModelIds: string[];
  appliedSelfModelIds: string[];
}): string {
  const parts: string[] = [];
  if (trace.recalledMemoryIds.length > 0) {
    parts.push(`memories: ${trace.recalledMemoryIds.length}`);
  }
  if (trace.appliedUserModelIds.length > 0) {
    parts.push(`user model: ${trace.appliedUserModelIds.length}`);
  }
  if (trace.appliedSelfModelIds.length > 0) {
    parts.push(`self model: ${trace.appliedSelfModelIds.length}`);
  }
  return parts.length > 0 ? dim("  " + parts.join(" · ")) : "";
}

// ─── Slash command help ──────────────────────────────────────

export function formatHelp(): string {
  const cmds = [
    ["/help",          "Show this help"],
    ["/exit, /quit",   "Exit"],
    ["/model",         "Show provider / model"],
    ["/config",        "Show effective config"],
    ["/session [id]",  "Show or switch session"],
    ["/memory",        "Recent semantic memories"],
    ["/self",          "Active self model"],
    ["/goals",         "Active goals"],
    ["/reflections",   "Recent reflections"],
  ];
  return [
    "",
    bold("  Commands"),
    dim("  " + "─".repeat(40)),
    ...cmds.map(([cmd, desc]) => `  ${bold(cmd.padEnd(18))} ${dim(desc)}`),
    "",
    dim("  Type anything else to chat."),
    "",
  ].join("\n");
}

// ─── Error ────────────────────────────────────────────────────

export function formatError(msg: string): string {
  return red("  ✖ " + msg);
}

// ─── Model info (for /model command) ─────────────────────────

export function formatModelInfo(config: {
  provider: string;
  model?: string;
  baseUrl?: string;
  apiKeyResolved: boolean;
}): string {
  const key = config.apiKeyResolved ? green("configured") : red("not set");
  return [
    `  ${bold("provider".padEnd(12))} ${config.provider}`,
    `  ${bold("model".padEnd(12))} ${config.model ?? "(default)"}`,
    `  ${bold("base url".padEnd(12))} ${config.baseUrl ?? "(default)"}`,
    `  ${bold("api key".padEnd(12))} ${key}`,
  ].join("\n");
}

// ─── Config display ──────────────────────────────────────────

export function formatConfigInfo(config: Record<string, unknown>): string {
  return Object.entries(config)
    .map(([k, v]) => `  ${bold(k.padEnd(18))} ${String(v)}`)
    .join("\n");
}
