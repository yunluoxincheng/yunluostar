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
    type TEXT NOT NULL DEFAULT 'long_term' CHECK(type IN ('core','long_term','medium_term','short_term','operational')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('suggested','active','paused','completed','rejected','deprecated')),
    priority REAL NOT NULL DEFAULT 0.5,
    mutable INTEGER NOT NULL DEFAULT 1,
    requires_approval INTEGER NOT NULL DEFAULT 0,
    approved_at INTEGER,
    source_episode_id TEXT REFERENCES episodes(id),
    evidence TEXT,
    rationale TEXT,
    conflict_of TEXT,
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
    action TEXT NOT NULL CHECK(action IN ('create','update','deprecate','supersede','confidence_lower','approve','reject','pause','complete','conflict')),
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

  migrateGoalsTable(sqlite);
  migrateAuditLogsTable(sqlite);
}

function needsRebuild(sqlite: ReturnType<typeof getRawSqlite>, table: string, marker: string): boolean {
  const row = sqlite.prepare(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name=?"
  ).get(table) as { sql: string } | undefined;
  return !!row && !row.sql.includes(marker);
}

function migrateGoalsTable(sqlite: ReturnType<typeof getRawSqlite>): void {
  // Rebuild if the CHECK constraints don't include new values.
  // Covers both truly old DBs (no type column) and intermediate DBs
  // that have the type column but still have the old narrow status CHECK.
  if (!needsRebuild(sqlite, "goals", "'suggested'")) return;

  // Check if old table has the type column (intermediate migration)
  const cols = sqlite.prepare("PRAGMA table_info(goals)").all() as Array<{ name: string }>;
  const hasType = cols.some((c) => c.name === "type");

  sqlite.exec(`
    CREATE TABLE goals_new (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'long_term' CHECK(type IN ('core','long_term','medium_term','short_term','operational')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('suggested','active','paused','completed','rejected','deprecated')),
      priority REAL NOT NULL DEFAULT 0.5,
      mutable INTEGER NOT NULL DEFAULT 1,
      requires_approval INTEGER NOT NULL DEFAULT 0,
      approved_at INTEGER,
      source_episode_id TEXT REFERENCES episodes(id),
      evidence TEXT,
      rationale TEXT,
      conflict_of TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    INSERT INTO goals_new (id, description, ${hasType ? "type," : ""} status, priority, created_at, updated_at)
      SELECT id, description, ${hasType ? "type," : ""} status, priority, created_at, updated_at FROM goals;
      DROP TABLE goals;
      ALTER TABLE goals_new RENAME TO goals;
    `);
}

function migrateAuditLogsTable(sqlite: ReturnType<typeof getRawSqlite>): void {
  if (!needsRebuild(sqlite, "audit_logs", "'approve'")) return;

  sqlite.exec(`
    CREATE TABLE audit_logs_new (
      id TEXT PRIMARY KEY,
      target_table TEXT NOT NULL,
      target_id TEXT NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('create','update','deprecate','supersede','confidence_lower','approve','reject','pause','complete','conflict')),
      before_value TEXT,
      after_value TEXT,
      reason TEXT,
      timestamp INTEGER NOT NULL DEFAULT (unixepoch())
    );
    INSERT INTO audit_logs_new SELECT * FROM audit_logs;
    DROP TABLE audit_logs;
    ALTER TABLE audit_logs_new RENAME TO audit_logs;
  `);
}
