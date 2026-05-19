import type { Command } from "commander";

export function registerGoalsCommand(program: Command): void {
  program
    .command("goals")
    .description("List goals (read-only)")
    .option("--json", "Output as JSON")
    .action(async (options) => {
      const { handleGoalsList } = await import("./goals-handler.js");
      await handleGoalsList(options);
    });
}
