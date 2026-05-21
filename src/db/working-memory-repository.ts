import { desc, eq, and } from "drizzle-orm";
import type { DbClient } from "./connection.js";
import { workingMemorySnapshots } from "./schema.js";
import type { DataScope } from "./scope.js";
import { withScope } from "./scope.js";

export function createWorkingMemoryRepository(db: DbClient, scope?: DataScope) {
  const scoped = scope
    ? and(eq(workingMemorySnapshots.userId, scope.userId), eq(workingMemorySnapshots.workspaceId, scope.workspaceId))
    : undefined;

  return {
    save(snapshot: typeof workingMemorySnapshots.$inferInsert) {
      return db.insert(workingMemorySnapshots).values(withScope(snapshot, scope)).returning().get();
    },

    findLatestBySession(sessionId: string) {
      const condition = scoped
        ? and(eq(workingMemorySnapshots.sessionId, sessionId), scoped)
        : eq(workingMemorySnapshots.sessionId, sessionId);
      const row = db
        .select()
        .from(workingMemorySnapshots)
        .where(condition)
        .orderBy(desc(workingMemorySnapshots.createdAt))
        .limit(1)
        .get();
      return row ?? null;
    },
  };
}

export type WorkingMemoryRepository = ReturnType<typeof createWorkingMemoryRepository>;
