import type Database from "better-sqlite3";

export interface SearchResult {
  id: string;
  score: number;
}

export interface EmbeddingStore {
  upsert(id: string, embedding: number[]): void;
  upsertBatch(items: Array<{ id: string; embedding: number[] }>): void;
  remove(id: string): void;
  search(queryEmbedding: number[], topK: number, minScore?: number): SearchResult[];
}

function toBuffer(embedding: number[]): Buffer {
  return Buffer.from(new Float32Array(embedding).buffer);
}

export const DEFAULT_EMBEDDING_DIMENSIONS = 1536;

export function createEmbeddingStore(
  sqlite: Database.Database,
  dimensions: number = DEFAULT_EMBEDDING_DIMENSIONS,
): EmbeddingStore {
  sqlite.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS memory_embeddings USING vec0(id TEXT PRIMARY KEY, embedding FLOAT[${dimensions}])`);

  const insertStmt = sqlite.prepare(
    "INSERT INTO memory_embeddings(id, embedding) VALUES (?, ?)"
  );
  const deleteStmt = sqlite.prepare(
    "DELETE FROM memory_embeddings WHERE id = ?"
  );
  const searchStmt = sqlite.prepare(
    "SELECT id, distance FROM memory_embeddings WHERE embedding MATCH ? ORDER BY distance LIMIT ?"
  );

  return {
    upsert(id: string, embedding: number[]): void {
      deleteStmt.run(id);
      insertStmt.run(id, toBuffer(embedding));
    },

    upsertBatch(items: Array<{ id: string; embedding: number[] }>): void {
      const tx = sqlite.transaction(() => {
        for (const item of items) {
          deleteStmt.run(item.id);
          insertStmt.run(item.id, toBuffer(item.embedding));
        }
      });
      tx();
    },

    remove(id: string): void {
      deleteStmt.run(id);
    },

    search(queryEmbedding: number[], topK: number, minScore?: number): SearchResult[] {
      const rows = searchStmt.all(toBuffer(queryEmbedding), topK) as Array<{
        id: string;
        distance: number;
      }>;

      // sqlite-vec returns cosine distance (0 = identical, 2 = opposite)
      // Convert to similarity score: 1 - distance
      return rows
        .map((row) => ({ id: row.id, score: 1 - row.distance }))
        .filter((r) => minScore === undefined || r.score >= minScore);
    },
  };
}
