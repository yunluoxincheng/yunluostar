import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import { drizzle } from "drizzle-orm/better-sqlite3";
import type { DbClient } from "../../src/db/connection.js";
import { runMigrations } from "../../src/db/migrate.js";
import { createLLMClient, createEmbeddingClientFromConfig } from "../../src/llm/factory.js";
import { createAgentController } from "../../src/agent/controller.js";

export function createTestDb(): DbClient & { close: () => void } {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  sqliteVec.load(sqlite);
  const db = drizzle(sqlite) as DbClient;
  runMigrations(db);
  return Object.assign(db, {
    close() { sqlite.close(); },
  });
}

export function getTestSqlite(db: DbClient): Database.Database {
  return (db as unknown as { $client: Database.Database }).$client;
}

export function createTestAgent(db: DbClient) {
  const llm = createLLMClient("deterministic");
  const embeddingClient = createEmbeddingClientFromConfig("deterministic");
  return createAgentController(llm, db, embeddingClient);
}
