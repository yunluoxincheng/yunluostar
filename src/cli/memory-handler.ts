import { loadConfig } from "../config.js";
import { createDbConnection, closeDbConnection } from "../db/connection.js";
import { runMigrations } from "../db/migrate.js";
import { createSemanticMemoriesRepository } from "../db/semantic-memories-repository.js";
import { createEpisodesRepository } from "../db/episodes-repository.js";

export async function handleMemoryList(options: {
  limit?: string;
  json?: boolean;
}): Promise<void> {
  const config = loadConfig();
  const db = createDbConnection(config.databasePath);
  try {
    runMigrations(db);
    const repo = createSemanticMemoriesRepository(db);
    const limit = parseInt(options.limit ?? "20", 10);
    const items = repo.findRecent(limit);

    if (options.json) {
      console.log(JSON.stringify({ items, total: items.length }, null, 2));
    } else {
      console.log(`\nSemantic Memories (${items.length}):\n`);
      for (const m of items) {
        console.log(`  [${m.status}] ${m.content.slice(0, 80)} (confidence: ${m.confidence})`);
      }
    }
  } finally {
    closeDbConnection(db);
  }
}

export async function handleMemoryShow(
  id: string,
  options: { json?: boolean },
): Promise<void> {
  const config = loadConfig();
  const db = createDbConnection(config.databasePath);
  try {
    runMigrations(db);
    const repo = createSemanticMemoriesRepository(db);
    const item = repo.findById(id);

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
  } finally {
    closeDbConnection(db);
  }
}
