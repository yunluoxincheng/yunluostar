import { eq, desc, and, gt } from "drizzle-orm";
import type { DbClient } from "./connection.js";
import { userModel } from "./schema.js";
import type { DataScope } from "./scope.js";
import { withScope } from "./scope.js";

export function createUserModelRepository(db: DbClient, scope?: DataScope) {
  const scoped = scope
    ? and(eq(userModel.userId, scope.userId), eq(userModel.workspaceId, scope.workspaceId))
    : undefined;

  return {
    insert(entry: typeof userModel.$inferInsert) {
      return db.insert(userModel).values(withScope(entry, scope)).returning().get();
    },

    findById(id: string) {
      return db.select().from(userModel).where(scoped ? and(eq(userModel.id, id), scoped) : eq(userModel.id, id)).get();
    },

    findActive() {
      const condition = scoped ? and(eq(userModel.status, "active"), scoped) : eq(userModel.status, "active");
      return db
        .select()
        .from(userModel)
        .where(condition)
        .orderBy(desc(userModel.confidence))
        .all();
    },

    findActiveByConfidence(minConfidence: number) {
      const condition = scoped
        ? and(eq(userModel.status, "active"), gt(userModel.confidence, minConfidence), scoped)
        : and(eq(userModel.status, "active"), gt(userModel.confidence, minConfidence));
      return db
        .select()
        .from(userModel)
        .where(condition)
        .orderBy(desc(userModel.confidence))
        .all();
    },

    findByKey(key: string) {
      const condition = scoped
        ? and(eq(userModel.key, key), eq(userModel.status, "active"), scoped)
        : and(eq(userModel.key, key), eq(userModel.status, "active"));
      return db
        .select()
        .from(userModel)
        .where(condition)
        .orderBy(desc(userModel.confidence))
        .all();
    },

    updateStatus(id: string, status: "active" | "deprecated" | "superseded", supersededBy?: string) {
      const values: Partial<typeof userModel.$inferInsert> = {
        status,
        updatedAt: new Date(),
      };
      if (supersededBy) values.supersededBy = supersededBy;
      return db.update(userModel).set(values).where(eq(userModel.id, id)).returning().get();
    },
  };
}

export type UserModelRepository = ReturnType<typeof createUserModelRepository>;
