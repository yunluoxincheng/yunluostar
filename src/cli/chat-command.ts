import type { Command } from "commander";

export function registerChatCommand(program: Command): void {
  program
    .command("chat")
    .description("Debug chat (ephemeral, does not write Bot long-term memory)")
    .option("-s, --session <sessionId>", "Session identifier")
    .option("-m, --message <message>", "Chat message (non-interactive mode)")
    .option("--json", "Output result as JSON with trace identifiers")
    .action(async (options, cmd) => {
      const { handleChat } = await import("./chat-handler.js");
      const { cliOverridesFromOpts } = await import("./index.js");
      const globalOpts = cmd.parent?.opts() ?? {};
      const cliOverrides = cliOverridesFromOpts(globalOpts);
      await handleChat(options, cliOverrides);
    });
}
