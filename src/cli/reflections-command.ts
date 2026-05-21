import type { Command } from "commander";

export function registerReflectionsCommand(program: Command): void {
  program
    .command("reflections")
    .description("List recent reflections")
    .option("-l, --limit <n>", "Number of entries", "20")
    .option("--json", "Output as JSON")
    .action(async (options, cmd) => {
      const { handleReflectionsList } = await import("./reflections-handler.js");
      const { cliOverridesFromOpts } = await import("./index.js");
      await handleReflectionsList(options, cliOverridesFromOpts(cmd.parent?.opts() ?? {}));
    });
}
