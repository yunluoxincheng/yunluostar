import type { Command } from "commander";

export function registerSelfCommand(program: Command): void {
  program
    .command("self")
    .description("Show current self model state")
    .option("--json", "Output as JSON")
    .action(async (options, cmd) => {
      const { handleSelfShow } = await import("./self-handler.js");
      const { cliOverridesFromOpts } = await import("./index.js");
      await handleSelfShow(options, cliOverridesFromOpts(cmd.parent?.opts() ?? {}));
    });
}
