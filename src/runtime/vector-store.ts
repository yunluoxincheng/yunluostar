import type { DbClient } from "../db/connection.js";
import { getRawSqlite } from "../db/connection.js";
import {
  createEmbeddingStore,
  type EmbeddingStore,
} from "../memory/embedding-store.js";

export type RuntimeVectorStoreDriver = "sqlite-vec";

export interface RuntimeVectorStore {
  readonly driver: RuntimeVectorStoreDriver;
  readonly store: EmbeddingStore;
}

export function createSqliteRuntimeVectorStore(db: DbClient): RuntimeVectorStore {
  return {
    driver: "sqlite-vec",
    store: createEmbeddingStore(getRawSqlite(db)),
  };
}
