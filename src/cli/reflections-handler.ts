import { loadConfig } from "../config.js";
import { createDbConnection, closeDbConnection } from "../db/connection.js";
import { runMigrations } from "../db/migrate.js";
import { createReflectionsRepository } from "../db/reflections-repository.js";

export async function handleReflectionsList(options: {
  limit?: string;
  json?: boolean;
}): Promise<void> {
  const config = loadConfig();
  const db = createDbConnection(config.databasePath);
  try {
    runMigrations(db);
    const repo = createReflectionsRepository(db);
    const limit = parseInt(options.limit ?? "20", 10);
    const items = repo.findRecent(limit);

    if (options.json) {
      console.log(JSON.stringify({ items, total: items.length }, null, 2));
    } else {
      console.log(`\nReflections (${items.length}):\n`);
      for (const r of items) {
        console.log(`  Episode: ${r.episodeId}`);
        console.log(`    Worked: ${r.whatWorked ?? "N/A"}`);
        console.log(`    Failed: ${r.whatFailed ?? "N/A"}`);
        console.log(`    Lessons: ${r.lessons ?? "N/A"}`);
        console.log("");
      }
    }
  } finally {
    closeDbConnection(db);
  }
}
