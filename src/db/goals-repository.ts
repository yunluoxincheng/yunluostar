import { eq, desc, and, isNull } from "drizzle-orm";
import type { DbClient } from "./connection.js";
import { goals } from "./schema.js";
import type { GoalType, GoalStatus } from "./schema.js";

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

    findByType(type: GoalType) {
      return db
        .select()
        .from(goals)
        .where(and(eq(goals.type, type), eq(goals.status, "active")))
        .orderBy(desc(goals.priority))
        .all();
    },

    findByStatus(status: GoalStatus) {
      return db
        .select()
        .from(goals)
        .where(eq(goals.status, status))
        .orderBy(desc(goals.priority))
        .all();
    },

    findActiveRanked() {
      return db
        .select()
        .from(goals)
        .where(
          and(
            eq(goals.status, "active"),
            isNull(goals.conflictOf),
          ),
        )
        .orderBy(desc(goals.priority), desc(goals.createdAt))
        .all();
    },

    updateStatus(id: string, status: GoalStatus) {
      return db
        .update(goals)
        .set({ status, updatedAt: new Date() })
        .where(eq(goals.id, id))
        .returning()
        .get();
    },

    updatePriority(id: string, priority: number) {
      return db
        .update(goals)
        .set({ priority, updatedAt: new Date() })
        .where(eq(goals.id, id))
        .returning()
        .get();
    },

    updateConflictOf(id: string, conflictOf: string | null) {
      return db
        .update(goals)
        .set({ conflictOf, updatedAt: new Date() })
        .where(eq(goals.id, id))
        .returning()
        .get();
    },

    updateApprovedAt(id: string, approvedAt: Date | null) {
      return db
        .update(goals)
        .set({ approvedAt, updatedAt: new Date() })
        .where(eq(goals.id, id))
        .returning()
        .get();
    },

    findByDescription(description: string) {
      return db
        .select()
        .from(goals)
        .where(eq(goals.description, description))
        .all();
    },
  };
}

export type GoalsRepository = ReturnType<typeof createGoalsRepository>;
