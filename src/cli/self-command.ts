import type { Command } from "commander";

export function registerSelfCommand(program: Command): void {
  program
    .command("self")
    .description("Show current self model state")
    .option("--json", "Output as JSON")
    .action(async (options) => {
      const { handleSelfShow } = await import("./self-handler.js");
      await handleSelfShow(options);
    });
}
