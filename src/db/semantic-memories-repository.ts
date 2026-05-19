import { eq, desc, and, gt } from "drizzle-orm";
import type { DbClient } from "./connection.js";
import { semanticMemories } from "./schema.js";

export function createSemanticMemoriesRepository(db: DbClient) {
  return {
    insert(memory: typeof semanticMemories.$inferInsert) {
      return db.insert(semanticMemories).values(memory).returning().get();
    },

    findById(id: string) {
      return db.select().from(semanticMemories).where(eq(semanticMemories.id, id)).get();
    },

    findRecent(limit = 20) {
      return db
        .select()
        .from(semanticMemories)
        .orderBy(desc(semanticMemories.createdAt))
        .limit(limit)
        .all();
    },

    findActive(limit = 50) {
      return db
        .select()
        .from(semanticMemories)
        .where(eq(semanticMemories.status, "active"))
        .orderBy(desc(semanticMemories.importance), desc(semanticMemories.createdAt))
        .limit(limit)
        .all();
    },

    findActiveByConfidence(minConfidence: number, limit = 50) {
      return db
        .select()
        .from(semanticMemories)
        .where(
          and(
            eq(semanticMemories.status, "active"),
            gt(semanticMemories.confidence, minConfidence),
          ),
        )
        .orderBy(desc(semanticMemories.importance))
        .limit(limit)
        .all();
    },

    updateStatus(id: string, status: "active" | "deprecated" | "superseded", supersededBy?: string) {
      const values: Partial<typeof semanticMemories.$inferInsert> = {
        status,
        updatedAt: new Date(),
      };
      if (supersededBy) values.supersededBy = supersededBy;
      return db.update(semanticMemories).set(values).where(eq(semanticMemories.id, id)).returning().get();
    },
  };
}

export type SemanticMemoriesRepository = ReturnType<typeof createSemanticMemoriesRepository>;
