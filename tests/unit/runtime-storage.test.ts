import { afterEach, describe, expect, it } from "vitest";
import { existsSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { configSchema } from "../../src/config.js";
import { createSqliteRuntimeStorage } from "../../src/runtime/storage.js";
import { createSqliteRuntimeVectorStore } from "../../src/runtime/vector-store.js";
import { createSemanticMemoriesRepository } from "../../src/db/semantic-memories-repository.js";

const dbFiles: string[] = [];

afterEach(() => {
  for (const file of dbFiles.splice(0)) {
    for (const suffix of ["", "-shm", "-wal"]) {
      const target = `${file}${suffix}`;
      if (existsSync(target)) unlinkSync(target);
    }
  }
});

describe("runtime storage abstraction", () => {
  it("opens migrated runtime-owned SQLite storage through one adapter", async () => {
    const dbPath = resolve(tmpdir(), `yunluo-storage-${Date.now()}.db`);
    dbFiles.push(dbPath);
    const storage = createSqliteRuntimeStorage(configSchema.parse({ databasePath: dbPath }));

    const count = await storage.withDb((db) => {
      const repo = createSemanticMemoriesRepository(db, {
        userId: "storage-user",
        workspaceId: "storage-workspace",
      });
      repo.insert({
        id: "storage-memory",
        content: "storage abstraction test",
        category: "test",
        importance: 0.5,
        confidence: 1,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return repo.findRecent(5).length;
    });

    expect(storage.driver).toBe("sqlite");
    expect(count).toBe(1);
  });

  it("creates runtime-owned vector storage through an adapter boundary", async () => {
    const dbPath = resolve(tmpdir(), `yunluo-vector-storage-${Date.now()}.db`);
    dbFiles.push(dbPath);
    const storage = createSqliteRuntimeStorage(configSchema.parse({ databasePath: dbPath }));

    const result = await storage.withDb((db) => {
      const vectorStore = createSqliteRuntimeVectorStore(db);
      vectorStore.store.upsert("vector-a", Array.from({ length: 1536 }, (_, index) => index === 0 ? 1 : 0));
      return {
        driver: vectorStore.driver,
        matches: vectorStore.store.search(Array.from({ length: 1536 }, (_, index) => index === 0 ? 1 : 0), 1),
      };
    });

    expect(result.driver).toBe("sqlite-vec");
    expect(result.matches[0]?.id).toBe("vector-a");
  });
});
