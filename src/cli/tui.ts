import chalk from "chalk";
import ora, { type Ora } from "ora";
import { resolve } from "node:path";

// ─── Color theme (Yunluo cognitive console) ──────────────────

const dim = chalk.dim;
const bold = chalk.bold;
const cyan = chalk.cyanBright;
const blue = chalk.blueBright;
const green = chalk.green;
const magenta = chalk.magentaBright;
const red = chalk.red;
const yellow = chalk.yellow;
const white = chalk.white;

const theme = {
  frame: chalk.hex("#5b6472"),
  quiet: chalk.hex("#7f8896"),
  title: chalk.hex("#e6f1ff").bold,
  accent: cyan,
  memory: green,
  self: magenta,
  goal: yellow,
  world: blue,
};

// ─── Box drawing ──────────────────────────────────────────────

function termWidth(): number {
  return process.stdout.columns || 80;
}

function padRight(text: string, width: number): string {
  const visibleLen = stripAnsi(text).length;
  return text + " ".repeat(Math.max(0, width - visibleLen));
}

function fitText(text: string, width: number): string {
  const clean = stripAnsi(text);
  if (clean.length <= width) return text;
  if (width <= 3) return clean.slice(0, width);
  return clean.slice(0, width - 3) + "...";
}

function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

function frame(lines: string[], width = Math.min(termWidth(), 76) - 4): string {
  const safeWidth = Math.max(42, width);
  const top = `╭${"─".repeat(safeWidth + 2)}╮`;
  const body = lines.map(line => {
    const fitted = fitText(line, safeWidth);
    return `│ ${padRight(fitted, safeWidth)} │`;
  });
  const bot = `╰${"─".repeat(safeWidth + 2)}╯`;
  return [theme.frame(top), ...body.map(l => theme.frame(l)), theme.frame(bot)].join("\n");
}

function keyValue(key: string, value: string, color = white): string {
  return `${theme.quiet(key.padEnd(12))} ${color(value)}`;
}

// ─── Banner ──────────────────────────────────────────────────

export function banner(version: string, provider: string, model: string): string {
  const cwd = process.cwd();
  const providerStr = model === "default"
    ? provider
    : `${provider} / ${model}`;

  return frame([
    `${theme.title("YUNLUOSTAR")} ${theme.quiet("v" + version)}  ${theme.accent("consciousness-like agent")}`,
    "",
    `${theme.memory("memory")} -> ${theme.self("self model")} -> ${theme.goal("goals")} -> ${theme.world("reflection")}`,
    "",
    keyValue("model", providerStr, theme.accent),
    keyValue("workspace", resolve(cwd), white),
    keyValue("session", "default   /session to switch", theme.goal),
  ]);
}

// ─── Prompt ───────────────────────────────────────────────────

export function promptStr(): string {
  return theme.accent("yunluo") + theme.frame(" :: ") + bold("› ");
}

// ─── Response rendering ──────────────────────────────────────

export function responsePrefix(): string {
  return "\n" + theme.accent("response") + theme.frame(" ─ ");
}

export function responseContinue(): string {
  return "           ";
}

export function formatResponse(text: string): string {
  return text.split("\n").join("\n" + responseContinue());
}

// ─── Footer line ─────────────────────────────────────────────

export function footerLine(model: string, sessionId: string): string {
  return theme.quiet(`  model ${model} · session ${sessionId}`);
}

// ─── Divider ──────────────────────────────────────────────────

export function divider(): string {
  return theme.frame("  " + "─".repeat(Math.max(24, Math.min(termWidth() - 4, 72))));
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
      sp = ora({ text: theme.quiet(text), color: "cyan" }).start();
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
    parts.push(theme.memory(`memories ${trace.recalledMemoryIds.length}`));
  }
  if (trace.appliedUserModelIds.length > 0) {
    parts.push(theme.world(`user ${trace.appliedUserModelIds.length}`));
  }
  if (trace.appliedSelfModelIds.length > 0) {
    parts.push(theme.self(`self ${trace.appliedSelfModelIds.length}`));
  }
  const episode = theme.quiet(`ep ${trace.episodeId.slice(0, 8)}`);
  const reflection = trace.reflectionId
    ? theme.quiet(`rf ${trace.reflectionId.slice(0, 8)}`)
    : "";
  const tail = [episode, reflection, ...parts].filter(Boolean).join(theme.frame(" · "));
  return tail ? "  " + tail : "";
}

// ─── Slash command help ──────────────────────────────────────

export function formatHelp(): string {
  const cmds = [
    [theme.accent("/help"),          "command map"],
    [theme.accent("/exit, /quit"),   "leave the shell"],
    [theme.accent("/model"),         "provider and model"],
    [theme.accent("/config"),        "effective runtime config"],
    [theme.accent("/session [id]"),  "show or switch session"],
    [theme.memory("/memory"),        "recent semantic memories"],
    [theme.self("/self"),            "active self model"],
    [theme.goal("/goals"),           "active goals"],
    [theme.world("/reflections"),    "recent reflections"],
  ];
  const lines = [
    `${theme.title("Command Surface")} ${theme.quiet("chat, inspect, steer")}`,
    "",
    ...cmds.map(([cmd, desc]) => `${padRight(bold(cmd), 24)} ${theme.quiet(desc)}`),
    "",
    `${theme.quiet("Type any non-command message to enter the interaction loop.")}`,
  ];
  return "\n" + frame(lines, Math.min(termWidth(), 70) - 4) + "\n";
}

// ─── Error ────────────────────────────────────────────────────

export function formatError(msg: string): string {
  return red("  x ") + bold("TUI error") + theme.quiet(" :: ") + msg;
}

// ─── Model info (for /model command) ─────────────────────────

export function formatModelInfo(config: {
  provider: string;
  model?: string;
  baseUrl?: string;
  apiKeyResolved: boolean;
}): string {
  const key = config.apiKeyResolved ? green("configured") : red("not set");
  return frame([
    `${theme.title("Model Link")}`,
    "",
    keyValue("provider", config.provider, theme.accent),
    keyValue("model", config.model ?? "(default)", white),
    keyValue("base url", config.baseUrl ?? "(default)", white),
    `${theme.quiet("api key".padEnd(12))} ${key}`,
  ], Math.min(termWidth(), 64) - 4);
}

// ─── Config display ──────────────────────────────────────────

export function formatConfigInfo(config: Record<string, unknown>): string {
  const rows = Object.entries(config)
    .map(([k, v]) => `${theme.quiet(k.padEnd(18))} ${white(String(v))}`);
  return frame([
    `${theme.title("Runtime Config")}`,
    "",
    ...rows,
  ], Math.min(termWidth(), 72) - 4);
}
