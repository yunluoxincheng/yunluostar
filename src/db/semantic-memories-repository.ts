import { eq, desc, and, gt } from "drizzle-orm";
import type { DbClient } from "./connection.js";
import { semanticMemories } from "./schema.js";
import type { DataScope } from "./scope.js";
import { withScope } from "./scope.js";

export function createSemanticMemoriesRepository(db: DbClient, scope?: DataScope) {
  const scoped = scope
    ? and(eq(semanticMemories.userId, scope.userId), eq(semanticMemories.workspaceId, scope.workspaceId))
    : undefined;
  const byId = (id: string) => scoped ? and(eq(semanticMemories.id, id), scoped) : eq(semanticMemories.id, id);

  return {
    insert(memory: typeof semanticMemories.$inferInsert) {
      return db.insert(semanticMemories).values(withScope(memory, scope)).returning().get();
    },

    findById(id: string) {
      return db.select().from(semanticMemories).where(byId(id)).get();
    },

    findRecent(limit = 20) {
      let query = db
        .select()
        .from(semanticMemories)
        .$dynamic();
      if (scoped) query = query.where(scoped);
      return query.orderBy(desc(semanticMemories.createdAt))
        .limit(limit)
        .all();
    },

    findActive(limit = 50) {
      const condition = scoped
        ? and(eq(semanticMemories.status, "active"), scoped)
        : eq(semanticMemories.status, "active");
      return db
        .select()
        .from(semanticMemories)
        .where(condition)
        .orderBy(desc(semanticMemories.importance), desc(semanticMemories.createdAt))
        .limit(limit)
        .all();
    },

    findActiveByConfidence(minConfidence: number, limit = 50) {
      const condition = scoped
        ? and(eq(semanticMemories.status, "active"), gt(semanticMemories.confidence, minConfidence), scoped)
        : and(eq(semanticMemories.status, "active"), gt(semanticMemories.confidence, minConfidence));
      return db
        .select()
        .from(semanticMemories)
        .where(condition)
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
      return db.update(semanticMemories).set(values).where(byId(id)).returning().get();
    },
  };
}

export type SemanticMemoriesRepository = ReturnType<typeof createSemanticMemoriesRepository>;
