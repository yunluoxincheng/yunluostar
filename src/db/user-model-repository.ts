import { eq, desc, and, gt } from "drizzle-orm";
import type { DbClient } from "./connection.js";
import { userModel } from "./schema.js";

export function createUserModelRepository(db: DbClient) {
  return {
    insert(entry: typeof userModel.$inferInsert) {
      return db.insert(userModel).values(entry).returning().get();
    },

    findById(id: string) {
      return db.select().from(userModel).where(eq(userModel.id, id)).get();
    },

    findActive() {
      return db
        .select()
        .from(userModel)
        .where(eq(userModel.status, "active"))
        .orderBy(desc(userModel.confidence))
        .all();
    },

    findActiveByConfidence(minConfidence: number) {
      return db
        .select()
        .from(userModel)
        .where(
          and(
            eq(userModel.status, "active"),
            gt(userModel.confidence, minConfidence),
          ),
        )
        .orderBy(desc(userModel.confidence))
        .all();
    },

    findByKey(key: string) {
      return db
        .select()
        .from(userModel)
        .where(
          and(
            eq(userModel.key, key),
            eq(userModel.status, "active"),
          ),
        )
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
