import { createDbConnection, closeDbConnection } from "../src/db/connection.js";
import { runMigrations } from "../src/db/migrate.js";
import { loadConfig } from "../src/config.js";

const config = loadConfig();
console.log(`Initializing database at ${config.databasePath}...`);

const db = createDbConnection(config.databasePath);
runMigrations(db);
closeDbConnection(db);

console.log("Database initialized successfully. Tables created:");
console.log("  episodes, semantic_memories, user_model, self_model, goals, reflections, audit_logs");
