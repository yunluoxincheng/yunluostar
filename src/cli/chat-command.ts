import type { Command } from "commander";

export function registerChatCommand(program: Command): void {
  program
    .command("chat")
    .description("Start a chat interaction with the agent")
    .option("-s, --session <sessionId>", "Session identifier")
    .option("-m, --message <message>", "Chat message (non-interactive mode)")
    .option("--json", "Output result as JSON with trace identifiers")
    .action(async (options) => {
      const { handleChat } = await import("./chat-handler.js");
      await handleChat(options);
    });
}
