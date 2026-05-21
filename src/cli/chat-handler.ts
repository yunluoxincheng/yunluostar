import { loadConfig, type AppConfig } from "../config.js";
import { createRuntimeClient } from "../runtime-client/client.js";
import { createChatRequest } from "../runtime-client/chat.js";
import type { ChatRequest } from "../protocol/runtime.js";

export async function handleChat(
  options: { session?: string; message?: string; json?: boolean },
  cliOverrides?: Partial<AppConfig>,
): Promise<void> {
  const config = loadConfig(cliOverrides);
  const message = options.message;
  if (!message) {
    const readline = await import("node:readline");
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise<string>((resolve) => {
      rl.question("You: ", (input) => {
        rl.close();
        resolve(input);
      });
    });
    return await processChat(answer, options.session ?? config.defaultSessionId, config, options.json);
  }

  await processChat(message, options.session ?? config.defaultSessionId, config, options.json);
}

async function processChat(
  message: string,
  sessionId: string,
  config: ReturnType<typeof loadConfig>,
  jsonOutput?: boolean,
): Promise<void> {
  let request: ChatRequest;
  try {
    request = createChatRequest(config, message, sessionId);
  } catch (error) {
    const errorMsg = (error as Error).message;
    if (jsonOutput) {
      console.log(JSON.stringify({ error: errorMsg }));
    } else {
      console.error(`Validation error: ${errorMsg}`);
    }
    return;
  }

  const client = createRuntimeClient(config);
  const result = await client.chat(request);

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`\nAgent: ${result.response}`);
    console.log(`\n[trace] episode=${result.trace.episodeId} reflection=${result.trace.reflectionId ?? "none"}`);
    if (result.trace.recalledMemoryIds.length > 0) {
      console.log(`[trace] recalled_memories=${result.trace.recalledMemoryIds.join(",")}`);
    }
    if (result.trace.appliedUserModelIds.length > 0) {
      console.log(`[trace] user_model=${result.trace.appliedUserModelIds.join(",")}`);
    }
  }
}
