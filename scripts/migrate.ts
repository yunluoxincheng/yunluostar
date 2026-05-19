import { createDbConnection, closeDbConnection } from "../src/db/connection.js";
import { runMigrations } from "../src/db/migrate.js";
import { loadConfig } from "../src/config.js";

const config = loadConfig();
console.log(`Running migrations at ${config.databasePath}...`);

const db = createDbConnection(config.databasePath);
runMigrations(db);
closeDbConnection(db);

console.log("Migrations applied successfully.");
