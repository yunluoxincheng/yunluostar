import { Command } from "commander";
import { registerChatCommand } from "./chat-command.js";
import { registerMemoryCommands } from "./memory-commands.js";
import { registerSelfCommand } from "./self-command.js";
import { registerGoalsCommand } from "./goals-command.js";
import { registerReflectionsCommand } from "./reflections-command.js";
import { registerDemoCommand } from "./demo-command.js";
import { registerConfigCommand } from "./config-command.js";

export function addGlobalOptions(program: Command): void {
  program
    .option("--provider <provider>", "LLM provider")
    .option("--base-url <url>", "LLM base URL")
    .option("--model <model>", "LLM model name")
    .option("--temperature <temp>", "LLM temperature")
    .option("--timeout <ms>", "LLM request timeout in ms")
    .option("--session <id>", "Default session ID")
    .option("--db <path>", "Database path");
}

export function cliOverridesFromOpts(opts: Record<string, unknown>): Record<string, unknown> {
  const overrides: Record<string, unknown> = {};
  if (opts.provider) overrides.provider = opts.provider;
  if (opts.baseUrl) overrides.baseUrl = opts.baseUrl;
  if (opts.model) overrides.model = opts.model;
  if (opts.temperature) overrides.temperature = Number(opts.temperature);
  if (opts.timeout) overrides.timeout = Number(opts.timeout);
  if (opts.session) overrides.defaultSessionId = opts.session;
  if (opts.db) overrides.databasePath = opts.db;
  return overrides;
}

export function createProgram(): Command {
  const program = new Command();

  program
    .name("yunluo")
    .description("A consciousness-like agent prototype")
    .version("0.1.0")
    .allowUnknownOption(false);

  addGlobalOptions(program);

  registerChatCommand(program);
  registerMemoryCommands(program);
  registerSelfCommand(program);
  registerGoalsCommand(program);
  registerReflectionsCommand(program);
  registerDemoCommand(program);
  registerConfigCommand(program);

  return program;
}

export async function main(): Promise<void> {
  const program = createProgram();

  // When no subcommand is provided, enter interactive shell.
  // Delegate all argument parsing to Commander — it correctly handles
  // global options with values (e.g. --provider deterministic chat ...)
  program.action(async () => {
    const { runInteractiveShell } = await import("./interactive-router.js");
    const overrides = cliOverridesFromOpts(program.opts());
    await runInteractiveShell(overrides);
  });

  await program.parseAsync(process.argv);
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return entry.includes("cli/index") || entry.includes("cli\\index") ||
    entry.endsWith("yunluo") || entry.endsWith("yunluo.js");
}

if (isDirectRun()) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
