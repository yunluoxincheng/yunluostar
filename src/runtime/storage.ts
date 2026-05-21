import type { AppConfig } from "../config.js";
import { createDbConnection, closeDbConnection, type DbClient } from "../db/connection.js";
import { runMigrations } from "../db/migrate.js";

export interface RuntimeStorage {
  readonly driver: "sqlite";
  withDb<T>(fn: (db: DbClient) => Promise<T> | T): Promise<T>;
}

export function createSqliteRuntimeStorage(config: AppConfig): RuntimeStorage {
  return {
    driver: "sqlite",
    async withDb<T>(fn: (db: DbClient) => Promise<T> | T): Promise<T> {
      const db = createDbConnection(config.databasePath);
      try {
        runMigrations(db);
        return await fn(db);
      } finally {
        closeDbConnection(db);
      }
    },
  };
}
