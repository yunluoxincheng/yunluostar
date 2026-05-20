import type { Command } from "commander";

export function registerGoalsCommand(program: Command): void {
  const goalsCmd = program
    .command("goals")
    .description("Manage agent goals");

  goalsCmd
    .command("list")
    .description("List all goals with hierarchy, status, and priority")
    .option("--json", "Output as JSON")
    .option("--status <status>", "Filter by status")
    .option("--type <type>", "Filter by type")
    .action(async (options) => {
      const { handleGoalsList } = await import("./goals-handler.js");
      await handleGoalsList(options);
    });

  goalsCmd
    .command("approve <id>")
    .description("Approve a suggested goal")
    .action(async (id: string) => {
      const { handleGoalTransition } = await import("./goals-handler.js");
      await handleGoalTransition(id, "approve");
    });

  goalsCmd
    .command("reject <id>")
    .description("Reject a suggested goal")
    .action(async (id: string) => {
      const { handleGoalTransition } = await import("./goals-handler.js");
      await handleGoalTransition(id, "reject");
    });

  goalsCmd
    .command("pause <id>")
    .description("Pause an active goal")
    .action(async (id: string) => {
      const { handleGoalTransition } = await import("./goals-handler.js");
      await handleGoalTransition(id, "pause");
    });

  goalsCmd
    .command("complete <id>")
    .description("Mark an active goal as completed")
    .action(async (id: string) => {
      const { handleGoalTransition } = await import("./goals-handler.js");
      await handleGoalTransition(id, "complete");
    });

  // Keep backward-compatible bare `yunluo goals` as list
  goalsCmd
    .action(async () => {
      const { handleGoalsList } = await import("./goals-handler.js");
      await handleGoalsList({});
    });
}
