import type { Command } from "commander";

export function registerConfigCommand(program: Command): void {
  const configCmd = program
    .command("config")
    .description("Show and update configuration");

  configCmd
    .command("show")
    .description("Display effective resolved configuration")
    .action(async () => {
      const { handleConfigShow } = await import("./config-handler.js");
      await handleConfigShow();
    });

  configCmd
    .command("set <key> <value>")
    .description("Set a configuration value (project scope by default)")
    .option("--user", "Write to user-level config instead of project-level")
    .action(async (key: string, value: string, options: { user?: boolean }) => {
      const { handleConfigSet } = await import("./config-handler.js");
      await handleConfigSet(key, value, options);
    });
}
