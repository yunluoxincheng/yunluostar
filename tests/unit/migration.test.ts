import { describe, it, expect, afterEach } from "vitest";
import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import { drizzle } from "drizzle-orm/better-sqlite3";
import type { DbClient } from "../../src/db/connection.js";
import { runMigrations } from "../../src/db/migrate.js";

function createOldSchemaDb(): Database.Database {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");

  // Old goals schema (no type column, narrow CHECK)
  sqlite.exec(`
    CREATE TABLE episodes (
      id TEXT PRIMARY KEY, session_id TEXT NOT NULL, timestamp INTEGER NOT NULL,
      user_input TEXT NOT NULL, agent_response TEXT NOT NULL,
      intent TEXT, action TEXT, outcome TEXT, lesson TEXT,
      importance REAL NOT NULL DEFAULT 0.5, confidence REAL NOT NULL DEFAULT 0.5,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','deprecated','superseded')),
      superseded_by TEXT, created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE goals (
      id TEXT PRIMARY KEY, description TEXT NOT NULL,
      priority REAL NOT NULL DEFAULT 0.5,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','completed','paused','deprecated')),
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE audit_logs (
      id TEXT PRIMARY KEY, target_table TEXT NOT NULL, target_id TEXT NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('create','update','deprecate','supersede','confidence_lower')),
      before_value TEXT, after_value TEXT, reason TEXT,
      timestamp INTEGER NOT NULL DEFAULT (unixepoch())
    );
    INSERT INTO goals (id, description) VALUES ('g-old', 'pre-existing goal');
  `);

  sqliteVec.load(sqlite);
  return sqlite;
}

describe("Migration compatibility for existing databases", () => {
  let sqlite: Database.Database | null = null;

  afterEach(() => {
    sqlite?.close();
  });

  it("rebuilds goals table so new status values are accepted", () => {
    sqlite = createOldSchemaDb();
    const db = drizzle(sqlite) as DbClient;
    runMigrations(db);

    // Should be able to insert goals with new status values
    const raw = sqlite!;
    raw.prepare(
      "INSERT INTO goals (id, description, type, status, mutable, requires_approval) VALUES (?, ?, ?, ?, ?, ?)"
    ).run("g-new", "new goal", "short_term", "suggested", 1, 1);

    const goal = raw.prepare("SELECT * FROM goals WHERE id = ?").get("g-new") as Record<string, unknown>;
    expect(goal.status).toBe("suggested");
    expect(goal.type).toBe("short_term");

    // Old data preserved
    const old = raw.prepare("SELECT * FROM goals WHERE id = ?").get("g-old") as Record<string, unknown>;
    expect(old.description).toBe("pre-existing goal");
    expect(old.type).toBe("long_term");
  });

  it("rebuilds audit_logs table so new action values are accepted", () => {
    sqlite = createOldSchemaDb();
    const db = drizzle(sqlite) as DbClient;
    runMigrations(db);

    const raw = sqlite!;
    raw.prepare(
      "INSERT INTO audit_logs (id, target_table, target_id, action) VALUES (?, ?, ?, ?)"
    ).run("al-new", "goals", "g-new", "approve");

    const log = raw.prepare("SELECT * FROM audit_logs WHERE id = ?").get("al-new") as Record<string, unknown>;
    expect(log.action).toBe("approve");
  });

  it("is idempotent on fresh databases", () => {
    sqlite = new Database(":memory:");
    sqlite.pragma("foreign_keys = ON");
    sqliteVec.load(sqlite);
    const db = drizzle(sqlite) as DbClient;

    runMigrations(db);
    runMigrations(db);

    const raw = sqlite!;
    raw.prepare(
      "INSERT INTO goals (id, description, type, status) VALUES (?, ?, ?, ?)"
    ).run("g-1", "test", "core", "active");

    const goal = raw.prepare("SELECT * FROM goals WHERE id = ?").get("g-1") as Record<string, unknown>;
    expect(goal.status).toBe("active");
  });

  it("rebuilds intermediate schema (has type column but old status CHECK)", () => {
    // Simulate a DB that ran the earlier broken migration: type column added,
    // but CHECK still only allows old status values
    sqlite = new Database(":memory:");
    sqlite.pragma("foreign_keys = ON");
    const raw = sqlite!;

    raw.exec(`
      CREATE TABLE episodes (
        id TEXT PRIMARY KEY, session_id TEXT NOT NULL, timestamp INTEGER NOT NULL,
        user_input TEXT NOT NULL, agent_response TEXT NOT NULL,
        intent TEXT, action TEXT, outcome TEXT, lesson TEXT,
        importance REAL NOT NULL DEFAULT 0.5, confidence REAL NOT NULL DEFAULT 0.5,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','deprecated','superseded')),
        superseded_by TEXT, created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE TABLE goals (
        id TEXT PRIMARY KEY, description TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'long_term' CHECK(type IN ('core','long_term','medium_term','short_term','operational')),
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','completed','paused','deprecated')),
        priority REAL NOT NULL DEFAULT 0.5, mutable INTEGER NOT NULL DEFAULT 1,
        requires_approval INTEGER NOT NULL DEFAULT 0, approved_at INTEGER,
        source_episode_id TEXT, evidence TEXT, rationale TEXT, conflict_of TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      INSERT INTO goals (id, description, type, status) VALUES ('g-mid', 'intermediate goal', 'core', 'active');
      CREATE TABLE audit_logs (
        id TEXT PRIMARY KEY, target_table TEXT NOT NULL, target_id TEXT NOT NULL,
        action TEXT NOT NULL CHECK(action IN ('create','update','deprecate','supersede','confidence_lower')),
        before_value TEXT, after_value TEXT, reason TEXT,
        timestamp INTEGER NOT NULL DEFAULT (unixepoch())
      );
    `);

    sqliteVec.load(raw);
    const db = drizzle(raw) as DbClient;
    runMigrations(db);

    // New status values should now work
    raw.prepare(
      "INSERT INTO goals (id, description, type, status) VALUES (?, ?, ?, ?)"
    ).run("g-new", "new goal", "short_term", "suggested");

    const goal = raw.prepare("SELECT * FROM goals WHERE id = ?").get("g-new") as Record<string, unknown>;
    expect(goal.status).toBe("suggested");

    // Intermediate data preserved with its type
    const mid = raw.prepare("SELECT * FROM goals WHERE id = ?").get("g-mid") as Record<string, unknown>;
    expect(mid.description).toBe("intermediate goal");
    expect(mid.type).toBe("core");
  });
});
