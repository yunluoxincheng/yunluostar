import { loadConfig } from "../config.js";
import { createRuntimeClient } from "../runtime-client/client.js";

export async function handleMemoryList(options: {
  limit?: string;
  json?: boolean;
}, cliOverrides: Record<string, unknown> = {}): Promise<void> {
  const config = loadConfig(cliOverrides);
  const client = createRuntimeClient(config);
  const limit = parseInt(options.limit ?? "20", 10);
  const result = await client.listMemory(limit);
  const items = result.items as Array<{
    status?: string;
    content?: string;
    confidence?: number;
  }>;

  if (options.json) {
    console.log(JSON.stringify({ items, total: items.length }, null, 2));
  } else {
    console.log(`\nSemantic Memories (${items.length}):\n`);
    for (const m of items) {
      console.log(`  [${m.status}] ${(m.content ?? "").slice(0, 80)} (confidence: ${m.confidence})`);
    }
  }
}

export async function handleMemoryShow(
  id: string,
  options: { json?: boolean },
  cliOverrides: Record<string, unknown> = {},
): Promise<void> {
  const config = loadConfig(cliOverrides);
  const client = createRuntimeClient(config);
  const item = await client.getMemory(id) as {
    id?: string;
    content?: string;
    category?: string | null;
    confidence?: number;
    importance?: number;
    status?: string;
    sourceEpisodeId?: string | null;
  } | null;

  if (!item) {
    console.error(`Memory not found: ${id}`);
    return;
  }

  if (options.json) {
    console.log(JSON.stringify(item, null, 2));
  } else {
    console.log(`\nMemory: ${item.id}`);
    console.log(`  Content: ${item.content}`);
    console.log(`  Category: ${item.category ?? "none"}`);
    console.log(`  Confidence: ${item.confidence}`);
    console.log(`  Importance: ${item.importance}`);
    console.log(`  Status: ${item.status}`);
    console.log(`  Source Episode: ${item.sourceEpisodeId ?? "none"}`);
  }
}
