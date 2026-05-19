import { loadConfig } from "../config.js";
import { createDbConnection, closeDbConnection } from "../db/connection.js";
import { runMigrations } from "../db/migrate.js";
import { createLLMClient } from "../llm/factory.js";
import { createAgentController } from "../agent/controller.js";

export async function handleDemo(options: {
  json?: boolean;
}): Promise<void> {
  const config = loadConfig();
  const db = createDbConnection(config.databasePath);
  try {
    runMigrations(db);
    const llm = createLLMClient(config.llmProvider);
    const agent = createAgentController(llm, db);
    const sessionId = "demo-session";

    console.log("=== Memory/Reflection Behavior-Change Demo ===\n");

    console.log("Step 1: User states a preference for implementation-focused answers.");
    const result1 = await agent.chat(
      "I prefer implementation-focused answers over broad conceptual explanations.",
      { sessionId },
    );
    console.log(`Agent: ${result1.response}\n`);

    console.log("Step 2: Later, user asks a related question.");
    const result2 = await agent.chat(
      "How should I handle error handling in my API?",
      { sessionId },
    );
    console.log(`Agent: ${result2.response}\n`);

    console.log("Step 3: User corrects the approach.");
    const result3 = await agent.chat(
      "Actually, I prefer practical code examples, not just explanations.",
      { sessionId },
    );
    console.log(`Agent: ${result3.response}\n`);

    console.log("Step 4: Verify the correction affects later behavior.");
    const result4 = await agent.chat(
      "Tell me about database migrations.",
      { sessionId },
    );
    console.log(`Agent: ${result4.response}\n`);

    if (options.json) {
      console.log(JSON.stringify({
        steps: [
          { step: 1, trace: result1.trace },
          { step: 2, trace: result2.trace },
          { step: 3, trace: result3.trace },
          { step: 4, trace: result4.trace },
        ],
      }, null, 2));
    } else {
      console.log("=== Trace Summary ===");
      for (let i = 1; i <= 4; i++) {
        const r = [result1, result2, result3, result4][i - 1];
        console.log(`Step ${i}: episode=${r.trace.episodeId}, memories=${r.trace.recalledMemoryIds.length}, user_model=${r.trace.appliedUserModelIds.length}`);
      }
    }

    console.log("\nDemo complete.");
  } finally {
    closeDbConnection(db);
  }
}
