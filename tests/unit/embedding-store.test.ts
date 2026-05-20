import { describe, it, expect, afterEach } from "vitest";
import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import { createEmbeddingStore } from "../../src/memory/embedding-store.js";

function createTestSqlite(): Database.Database {
  const sqlite = new Database(":memory:");
  sqliteVec.load(sqlite);
  return sqlite;
}

describe("EmbeddingStore", () => {
  let sqlite: Database.Database | null = null;

  afterEach(() => {
    sqlite?.close();
    sqlite = null;
  });

  it("upserts and searches embeddings", () => {
    sqlite = createTestSqlite();
    const store = createEmbeddingStore(sqlite, 4);

    store.upsert("item-1", [1.0, 0.0, 0.0, 0.0]);
    store.upsert("item-2", [0.0, 1.0, 0.0, 0.0]);
    store.upsert("item-3", [0.9, 0.1, 0.0, 0.0]);

    const results = store.search([1.0, 0.0, 0.0, 0.0], 3);
    expect(results).toHaveLength(3);
    expect(results[0].id).toBe("item-1");
    expect(results[0].score).toBeCloseTo(1.0, 4);
    expect(results[1].id).toBe("item-3");
    expect(results[1].score).toBeGreaterThan(results[2].score);
  });

  it("upsertBatch inserts multiple items", () => {
    sqlite = createTestSqlite();
    const store = createEmbeddingStore(sqlite, 4);

    store.upsertBatch([
      { id: "a", embedding: [1.0, 0.0, 0.0, 0.0] },
      { id: "b", embedding: [0.0, 1.0, 0.0, 0.0] },
      { id: "c", embedding: [0.0, 0.0, 1.0, 0.0] },
    ]);

    const results = store.search([0.0, 0.0, 1.0, 0.0], 3);
    expect(results).toHaveLength(3);
    expect(results[0].id).toBe("c");
    expect(results[0].score).toBeCloseTo(1.0, 4);
  });

  it("removes an embedding", () => {
    sqlite = createTestSqlite();
    const store = createEmbeddingStore(sqlite, 4);

    store.upsert("target", [1.0, 0.0, 0.0, 0.0]);
    store.upsert("other", [0.0, 1.0, 0.0, 0.0]);
    store.remove("target");

    const results = store.search([1.0, 0.0, 0.0, 0.0], 5);
    const found = results.find((r) => r.id === "target");
    expect(found).toBeUndefined();
    expect(results).toHaveLength(1);
  });

  it("filters results by minScore", () => {
    sqlite = createTestSqlite();
    const store = createEmbeddingStore(sqlite, 4);

    store.upsert("close", [0.95, 0.05, 0.0, 0.0]);
    store.upsert("far", [0.0, 0.0, 1.0, 0.0]);

    const results = store.search([1.0, 0.0, 0.0, 0.0], 10, 0.9);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("close");
  });

  it("returns empty array when no results", () => {
    sqlite = createTestSqlite();
    const store = createEmbeddingStore(sqlite, 4);

    const results = store.search([1.0, 0.0, 0.0, 0.0], 5);
    expect(results).toHaveLength(0);
  });

  it("handles upsert (replace existing)", () => {
    sqlite = createTestSqlite();
    const store = createEmbeddingStore(sqlite, 4);

    store.upsert("item", [1.0, 0.0, 0.0, 0.0]);
    store.upsert("item", [0.0, 0.0, 0.0, 1.0]);

    const results = store.search([0.0, 0.0, 0.0, 1.0], 1);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("item");
    expect(results[0].score).toBeCloseTo(1.0, 4);
  });
});
