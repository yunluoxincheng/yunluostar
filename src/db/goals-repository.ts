import { eq, desc, and, isNull } from "drizzle-orm";
import type { DbClient } from "./connection.js";
import { goals } from "./schema.js";
import type { GoalType, GoalStatus } from "./schema.js";
import type { DataScope } from "./scope.js";
import { withScope } from "./scope.js";

export function createGoalsRepository(db: DbClient, scope?: DataScope) {
  const scoped = scope
    ? and(eq(goals.userId, scope.userId), eq(goals.workspaceId, scope.workspaceId))
    : undefined;
  const byId = (id: string) => scoped ? and(eq(goals.id, id), scoped) : eq(goals.id, id);

  return {
    insert(goal: typeof goals.$inferInsert) {
      return db.insert(goals).values(withScope(goal, scope)).returning().get();
    },

    findAll() {
      let query = db
        .select()
        .from(goals)
        .$dynamic();
      if (scoped) query = query.where(scoped);
      return query.orderBy(desc(goals.priority), desc(goals.createdAt))
        .all();
    },

    findActive() {
      const condition = scoped ? and(eq(goals.status, "active"), scoped) : eq(goals.status, "active");
      return db
        .select()
        .from(goals)
        .where(condition)
        .orderBy(desc(goals.priority))
        .all();
    },

    findById(id: string) {
      return db.select().from(goals).where(byId(id)).get();
    },

    findByType(type: GoalType) {
      const condition = scoped
        ? and(eq(goals.type, type), eq(goals.status, "active"), scoped)
        : and(eq(goals.type, type), eq(goals.status, "active"));
      return db
        .select()
        .from(goals)
        .where(condition)
        .orderBy(desc(goals.priority))
        .all();
    },

    findByStatus(status: GoalStatus) {
      const condition = scoped ? and(eq(goals.status, status), scoped) : eq(goals.status, status);
      return db
        .select()
        .from(goals)
        .where(condition)
        .orderBy(desc(goals.priority))
        .all();
    },

    findActiveRanked() {
      const condition = scoped
        ? and(eq(goals.status, "active"), isNull(goals.conflictOf), scoped)
        : and(eq(goals.status, "active"), isNull(goals.conflictOf));
      return db
        .select()
        .from(goals)
        .where(condition)
        .orderBy(desc(goals.priority), desc(goals.createdAt))
        .all();
    },

    updateStatus(id: string, status: GoalStatus) {
      return db
        .update(goals)
        .set({ status, updatedAt: new Date() })
        .where(byId(id))
        .returning()
        .get();
    },

    updatePriority(id: string, priority: number) {
      return db
        .update(goals)
        .set({ priority, updatedAt: new Date() })
        .where(byId(id))
        .returning()
        .get();
    },

    updateConflictOf(id: string, conflictOf: string | null) {
      return db
        .update(goals)
        .set({ conflictOf, updatedAt: new Date() })
        .where(byId(id))
        .returning()
        .get();
    },

    updateApprovedAt(id: string, approvedAt: Date | null) {
      return db
        .update(goals)
        .set({ approvedAt, updatedAt: new Date() })
        .where(byId(id))
        .returning()
        .get();
    },

    findByDescription(description: string) {
      const condition = scoped ? and(eq(goals.description, description), scoped) : eq(goals.description, description);
      return db
        .select()
        .from(goals)
        .where(condition)
        .all();
    },
  };
}

export type GoalsRepository = ReturnType<typeof createGoalsRepository>;
