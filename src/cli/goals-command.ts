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
    .action(async (options, cmd) => {
      const { handleGoalsList } = await import("./goals-handler.js");
      const { cliOverridesFromOpts } = await import("./index.js");
      await handleGoalsList(options, cliOverridesFromOpts(cmd.parent?.parent?.opts() ?? {}));
    });

  goalsCmd
    .command("approve <id>")
    .description("Approve a suggested goal")
    .action(async (id: string, cmd) => {
      const { handleGoalTransition } = await import("./goals-handler.js");
      const { cliOverridesFromOpts } = await import("./index.js");
      await handleGoalTransition(id, "approve", cliOverridesFromOpts(cmd.parent?.parent?.opts() ?? {}));
    });

  goalsCmd
    .command("reject <id>")
    .description("Reject a suggested goal")
    .action(async (id: string, cmd) => {
      const { handleGoalTransition } = await import("./goals-handler.js");
      const { cliOverridesFromOpts } = await import("./index.js");
      await handleGoalTransition(id, "reject", cliOverridesFromOpts(cmd.parent?.parent?.opts() ?? {}));
    });

  goalsCmd
    .command("pause <id>")
    .description("Pause an active goal")
    .action(async (id: string, cmd) => {
      const { handleGoalTransition } = await import("./goals-handler.js");
      const { cliOverridesFromOpts } = await import("./index.js");
      await handleGoalTransition(id, "pause", cliOverridesFromOpts(cmd.parent?.parent?.opts() ?? {}));
    });

  goalsCmd
    .command("complete <id>")
    .description("Mark an active goal as completed")
    .action(async (id: string, cmd) => {
      const { handleGoalTransition } = await import("./goals-handler.js");
      const { cliOverridesFromOpts } = await import("./index.js");
      await handleGoalTransition(id, "complete", cliOverridesFromOpts(cmd.parent?.parent?.opts() ?? {}));
    });

  // Keep backward-compatible bare `yunluo goals` as list
  goalsCmd
    .action(async (_options, cmd) => {
      const { handleGoalsList } = await import("./goals-handler.js");
      const { cliOverridesFromOpts } = await import("./index.js");
      await handleGoalsList({}, cliOverridesFromOpts(cmd.parent?.opts() ?? {}));
    });
}
