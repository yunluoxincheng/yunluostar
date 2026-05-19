import { loadConfig } from "../config.js";
import { createDbConnection, closeDbConnection } from "../db/connection.js";
import { runMigrations } from "../db/migrate.js";
import { createSelfModelRepository } from "../db/self-model-repository.js";

export async function handleSelfShow(options: {
  json?: boolean;
}): Promise<void> {
  const config = loadConfig();
  const db = createDbConnection(config.databasePath);
  try {
    runMigrations(db);
    const repo = createSelfModelRepository(db);
    const items = repo.findActive();

    if (options.json) {
      console.log(JSON.stringify({ items, total: items.length }, null, 2));
    } else {
      console.log(`\nSelf Model (${items.length} active traits):\n`);
      for (const item of items) {
        console.log(`  ${item.trait}: ${item.value}`);
        console.log(`    evidence: ${item.evidence.slice(0, 60)} (confidence: ${item.confidence})`);
      }
    }
  } finally {
    closeDbConnection(db);
  }
}
