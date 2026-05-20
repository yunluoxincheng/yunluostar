import { desc, eq } from "drizzle-orm";
import type { DbClient } from "./connection.js";
import { workingMemorySnapshots } from "./schema.js";

export function createWorkingMemoryRepository(db: DbClient) {
  return {
    save(snapshot: typeof workingMemorySnapshots.$inferInsert) {
      return db.insert(workingMemorySnapshots).values(snapshot).returning().get();
    },

    findLatestBySession(sessionId: string) {
      const row = db
        .select()
        .from(workingMemorySnapshots)
        .where(eq(workingMemorySnapshots.sessionId, sessionId))
        .orderBy(desc(workingMemorySnapshots.createdAt))
        .limit(1)
        .get();
      return row ?? null;
    },
  };
}

export type WorkingMemoryRepository = ReturnType<typeof createWorkingMemoryRepository>;
