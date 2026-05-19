import { eq, desc } from "drizzle-orm";
import type { DbClient } from "./connection.js";
import { goals } from "./schema.js";

export function createGoalsRepository(db: DbClient) {
  return {
    insert(goal: typeof goals.$inferInsert) {
      return db.insert(goals).values(goal).returning().get();
    },

    findAll() {
      return db
        .select()
        .from(goals)
        .orderBy(desc(goals.priority), desc(goals.createdAt))
        .all();
    },

    findActive() {
      return db
        .select()
        .from(goals)
        .where(eq(goals.status, "active"))
        .orderBy(desc(goals.priority))
        .all();
    },

    findById(id: string) {
      return db.select().from(goals).where(eq(goals.id, id)).get();
    },
  };
}

export type GoalsRepository = ReturnType<typeof createGoalsRepository>;
