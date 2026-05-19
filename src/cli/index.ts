import { Command } from "commander";
import { registerChatCommand } from "./chat-command.js";
import { registerMemoryCommands } from "./memory-commands.js";
import { registerSelfCommand } from "./self-command.js";
import { registerGoalsCommand } from "./goals-command.js";
import { registerReflectionsCommand } from "./reflections-command.js";
import { registerDemoCommand } from "./demo-command.js";

export function createProgram(): Command {
  const program = new Command();

  program
    .name("yunluostar")
    .description("A consciousness-like agent prototype")
    .version("0.1.0");

  registerChatCommand(program);
  registerMemoryCommands(program);
  registerSelfCommand(program);
  registerGoalsCommand(program);
  registerReflectionsCommand(program);
  registerDemoCommand(program);

  return program;
}

export async function main(): Promise<void> {
  const program = createProgram();
  await program.parseAsync(process.argv);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
