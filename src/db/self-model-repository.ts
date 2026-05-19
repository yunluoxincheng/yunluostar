import { eq, desc, and, gt } from "drizzle-orm";
import type { DbClient } from "./connection.js";
import { selfModel } from "./schema.js";

export function createSelfModelRepository(db: DbClient) {
  return {
    insert(entry: typeof selfModel.$inferInsert) {
      return db.insert(selfModel).values(entry).returning().get();
    },

    findById(id: string) {
      return db.select().from(selfModel).where(eq(selfModel.id, id)).get();
    },

    findActive() {
      return db
        .select()
        .from(selfModel)
        .where(eq(selfModel.status, "active"))
        .orderBy(desc(selfModel.confidence))
        .all();
    },

    findByTrait(trait: string) {
      return db
        .select()
        .from(selfModel)
        .where(
          and(
            eq(selfModel.trait, trait),
            eq(selfModel.status, "active"),
          ),
        )
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
