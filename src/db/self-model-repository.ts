import { eq, desc, and, gt } from "drizzle-orm";
import type { DbClient } from "./connection.js";
import { selfModel } from "./schema.js";
import type { DataScope } from "./scope.js";
import { withScope } from "./scope.js";

export function createSelfModelRepository(db: DbClient, scope?: DataScope) {
  const scoped = scope
    ? and(eq(selfModel.userId, scope.userId), eq(selfModel.workspaceId, scope.workspaceId))
    : undefined;

  return {
    insert(entry: typeof selfModel.$inferInsert) {
      return db.insert(selfModel).values(withScope(entry, scope)).returning().get();
    },

    findById(id: string) {
      return db.select().from(selfModel).where(scoped ? and(eq(selfModel.id, id), scoped) : eq(selfModel.id, id)).get();
    },

    findActive() {
      const condition = scoped ? and(eq(selfModel.status, "active"), scoped) : eq(selfModel.status, "active");
      return db
        .select()
        .from(selfModel)
        .where(condition)
        .orderBy(desc(selfModel.confidence))
        .all();
    },

    findByTrait(trait: string) {
      const condition = scoped
        ? and(eq(selfModel.trait, trait), eq(selfModel.status, "active"), scoped)
        : and(eq(selfModel.trait, trait), eq(selfModel.status, "active"));
      return db
        .select()
        .from(selfModel)
        .where(condition)
        .orderBy(desc(selfModel.confidence))
        .all();
    },

    updateStatus(id: string, status: "active" | "deprecated" | "superseded", supersededBy?: string) {
      const values: Partial<typeof selfModel.$inferInsert> = {
        status,
        updatedAt: new Date(),
      };
      if (supersededBy) values.supersededBy = supersededBy;
      return db.update(selfModel).set(values).where(eq(selfModel.id, id)).returning().get();
    },
  };
}

export type SelfModelRepository = ReturnType<typeof createSelfModelRepository>;
