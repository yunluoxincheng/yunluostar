import { sql } from "drizzle-orm";
import type { DbClient } from "./connection.js";
import { getRawSqlite } from "./connection.js";
import { DEFAULT_EMBEDDING_DIMENSIONS } from "../memory/embedding-store.js";

const CREATE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS episodes (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    user_input TEXT NOT NULL,
    agent_response TEXT NOT NULL,
    intent TEXT,
    action TEXT,
    outcome TEXT,
    lesson TEXT,
    importance REAL NOT NULL DEFAULT 0.5,
    confidence REAL NOT NULL DEFAULT 0.5,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','deprecated','superseded')),
    superseded_by TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,

  `CREATE TABLE IF NOT EXISTS semantic_memories (
    id TEXT PRIMARY KEY,
    source_episode_id TEXT REFERENCES episodes(id),
    content TEXT NOT NULL,
    category TEXT,
    importance REAL NOT NULL DEFAULT 0.5,
    confidence REAL NOT NULL DEFAULT 0.5,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','deprecated','superseded')),
    superseded_by TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,

  `CREATE TABLE IF NOT EXISTS user_model (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    evidence TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 0.5,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','deprecated','superseded')),
    superseded_by TEXT,
    source_episode_id TEXT REFERENCES episodes(id),
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,

  `CREATE TABLE IF NOT EXISTS self_model (
    id TEXT PRIMARY KEY,
    trait TEXT NOT NULL,
    value TEXT NOT NULL,
    evidence TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 0.5,
    mutable INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','deprecated','superseded')),
    superseded_by TEXT,
    source_episode_id TEXT REFERENCES episodes(id),
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,

  `CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    priority REAL NOT NULL DEFAULT 0.5,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','completed','paused','deprecated')),
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,

  `CREATE TABLE IF NOT EXISTS reflections (
    id TEXT PRIMARY KEY,
    episode_id TEXT NOT NULL REFERENCES episodes(id),
    what_worked TEXT,
    what_failed TEXT,
    lessons TEXT,
    update_candidates TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,

  `CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    target_table TEXT NOT NULL,
    target_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('create','update','deprecate','supersede','confidence_lower')),
    before_value TEXT,
    after_value TEXT,
    reason TEXT,
    timestamp INTEGER NOT NULL DEFAULT (unixepoch())
  )`,

  `CREATE TABLE IF NOT EXISTS working_memory_snapshots (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    snapshot TEXT NOT NULL,
    episode_id TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
];

export function runMigrations(db: DbClient): void {
  for (const stmt of CREATE_STATEMENTS) {
    db.run(sql.raw(stmt));
  }
  const sqlite = getRawSqlite(db);
  sqlite.exec(
    `CREATE VIRTUAL TABLE IF NOT EXISTS memory_embeddings USING vec0(id TEXT PRIMARY KEY, embedding FLOAT[${DEFAULT_EMBEDDING_DIMENSIONS}])`
  );
}
