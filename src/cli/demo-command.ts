import type { Command } from "commander";

export function registerDemoCommand(program: Command): void {
  program
    .command("demo")
    .description("Run the memory/reflection behavior-change demonstration")
    .option("--json", "Output as JSON")
    .action(async (options) => {
      const { handleDemo } = await import("./demo-handler.js");
      await handleDemo(options);
    });
}
