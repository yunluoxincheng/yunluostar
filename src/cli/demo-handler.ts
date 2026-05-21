import { loadConfig } from "../config.js";
import { createRuntimeClient } from "../runtime-client/client.js";
import type { BotMessageResponse } from "../bot/protocol.js";

const BOT_REQUEST = {
  platformId: "demo",
  adapterId: "cli-demo",
  conversationId: "demo-conversation",
  senderUserId: "demo-user",
};

export async function handleDemo(options: {
  json?: boolean;
}): Promise<void> {
  const config = loadConfig();
  const client = createRuntimeClient(config);

  console.log("=== Bot Cognitive Pipeline Demo ===\n");
  console.log("This demo sends messages through the Bot API (POST /v1/bot/message).");
  console.log("Each message flows through: memory awakening → context building → LLM → episode recording → reflection → consolidation.\n");

  console.log("Step 1: User states a preference for implementation-focused answers.");
  const result1 = await sendBotMessage(client, "I prefer implementation-focused answers over broad conceptual explanations.");
  console.log(`Agent: ${result1.responseText}\n`);

  console.log("Step 2: Later, user asks a related question.");
  const result2 = await sendBotMessage(client, "How should I handle error handling in my API?");
  console.log(`Agent: ${result2.responseText}\n`);

  console.log("Step 3: User corrects the approach.");
  const result3 = await sendBotMessage(client, "Actually, I prefer practical code examples, not just explanations.");
  console.log(`Agent: ${result3.responseText}\n`);

  console.log("Step 4: Verify the correction affects later behavior.");
  const result4 = await sendBotMessage(client, "Tell me about database migrations.");
  console.log(`Agent: ${result4.responseText}\n`);

  if (options.json) {
    console.log(JSON.stringify({ steps: [result1, result2, result3, result4] }, null, 2));
  } else {
    console.log("=== Bot Trace Summary ===");
    for (let i = 1; i <= 4; i++) {
      const r = [result1, result2, result3, result4][i - 1];
      console.log(`Step ${i}: traceId=${r.traceId}, episode=${r.episodeId ?? "none"}, reflection=${r.reflectionId ?? "none"}, memories=${r.memoryIds.length}, goals=${r.goalIds.length}, plugins=${r.pluginEvents.length}`);
    }
  }

  console.log("\nDemo complete.");
}

async function sendBotMessage(client: ReturnType<typeof createRuntimeClient>, text: string): Promise<BotMessageResponse> {
  return client.sendBotMessage({
    ...BOT_REQUEST,
    text,
  });
}
