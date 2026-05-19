import type { Command } from "commander";

export function registerMemoryCommands(program: Command): void {
  const memory = program.command("memory").description("Inspect semantic memories");

  memory
    .command("list")
    .description("List recent semantic memories")
    .option("-l, --limit <n>", "Number of entries", "20")
    .option("--json", "Output as JSON")
    .action(async (options) => {
      const { handleMemoryList } = await import("./memory-handler.js");
      await handleMemoryList(options);
    });

  memory
    .command("show <id>")
    .description("Show a specific semantic memory")
    .option("--json", "Output as JSON")
    .action(async (id, options) => {
      const { handleMemoryShow } = await import("./memory-handler.js");
      await handleMemoryShow(id, options);
    });
}
