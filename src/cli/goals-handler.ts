import { loadConfig } from "../config.js";
import { createDbConnection, closeDbConnection } from "../db/connection.js";
import { runMigrations } from "../db/migrate.js";
import { createGoalsRepository } from "../db/goals-repository.js";

export async function handleGoalsList(options: {
  json?: boolean;
}): Promise<void> {
  const config = loadConfig();
  const db = createDbConnection(config.databasePath);
  try {
    runMigrations(db);
    const repo = createGoalsRepository(db);
    const items = repo.findActive();

    if (options.json) {
      console.log(JSON.stringify({ items, total: items.length }, null, 2));
    } else {
      console.log(`\nGoals (${items.length} active):\n`);
      for (const g of items) {
        console.log(`  [${g.status}] ${g.description} (priority: ${g.priority})`);
      }
    }
  } finally {
    closeDbConnection(db);
  }
}
