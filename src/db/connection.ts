import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as fs from "node:fs";
import * as path from "node:path";
import * as schema from "./schema.js";

export function createDbConnection(dbPath: string) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}

export type DbClient = ReturnType<typeof createDbConnection>;

export function closeDbConnection(db: DbClient): void {
  const sqlite = (db as unknown as { $client: Database.Database }).$client;
  sqlite.close();
}
