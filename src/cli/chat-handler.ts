import { chatInputSchema } from "../models/schemas.js";
import { loadConfig, type AppConfig } from "../config.js";
import { createDbConnection, closeDbConnection } from "../db/connection.js";
import { runMigrations } from "../db/migrate.js";
import { createLLMClient, createEmbeddingClientFromConfig } from "../llm/factory.js";
import { createAgentController } from "../agent/controller.js";

export async function handleChat(
  options: { session?: string; message?: string; json?: boolean },
  cliOverrides?: Partial<AppConfig>,
): Promise<void> {
  const config = loadConfig(cliOverrides);
  const db = createDbConnection(config.databasePath);
  try {
    runMigrations(db);

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
      return await processChat(answer, options.session ?? config.defaultSessionId, config, db, options.json);
    }

    await processChat(message, options.session ?? config.defaultSessionId, config, db, options.json);
  } finally {
    closeDbConnection(db);
  }
}

async function processChat(
  message: string,
  sessionId: string,
  config: ReturnType<typeof loadConfig>,
  db: ReturnType<typeof createDbConnection>,
  jsonOutput?: boolean,
): Promise<void> {
  const parsed = chatInputSchema.safeParse({ message, session: sessionId });
  if (!parsed.success) {
    const errorMsg = parsed.error.issues.map((i) => i.message).join(", ");
    if (jsonOutput) {
      console.log(JSON.stringify({ error: errorMsg }));
    } else {
      console.error(`Validation error: ${errorMsg}`);
    }
    return;
  }

  const llm = createLLMClient(config.provider, config);
  const embeddingClient = createEmbeddingClientFromConfig(config.provider, config);
  const agent = createAgentController(llm, db, embeddingClient);
  const result = await agent.chat(parsed.data.message, { sessionId: parsed.data.session ?? sessionId });

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
