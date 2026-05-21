import type { Command } from "commander";

export function registerDemoCommand(program: Command): void {
  program
    .command("demo")
    .description("Run the Bot cognitive pipeline demo (via POST /v1/bot/message)")
    .option("--json", "Output as JSON")
    .action(async (options) => {
      const { handleDemo } = await import("./demo-handler.js");
      await handleDemo(options);
    });
}
