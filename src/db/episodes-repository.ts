import { eq, desc, and } from "drizzle-orm";
import type { DbClient } from "./connection.js";
import { episodes } from "./schema.js";
import type { DataScope } from "./scope.js";
import { withScope } from "./scope.js";

export function createEpisodesRepository(db: DbClient, scope?: DataScope) {
  const scoped = scope
    ? and(eq(episodes.userId, scope.userId), eq(episodes.workspaceId, scope.workspaceId))
    : undefined;

  return {
    insert(episode: typeof episodes.$inferInsert) {
      return db.insert(episodes).values(withScope(episode, scope)).returning().get();
    },

    findById(id: string) {
      return db.select().from(episodes).where(scoped ? and(eq(episodes.id, id), scoped) : eq(episodes.id, id)).get();
    },

    findBySession(sessionId: string, limit = 20) {
      const condition = scoped ? and(eq(episodes.sessionId, sessionId), scoped) : eq(episodes.sessionId, sessionId);
      return db
        .select()
        .from(episodes)
        .where(condition)
        .orderBy(desc(episodes.timestamp))
        .limit(limit)
        .all();
    },

    findRecentActive(limit = 20) {
      const condition = scoped ? and(eq(episodes.status, "active"), scoped) : eq(episodes.status, "active");
      return db
        .select()
        .from(episodes)
        .where(condition)
        .orderBy(desc(episodes.timestamp))
        .limit(limit)
        .all();
    },

    updateStatus(id: string, status: "active" | "deprecated" | "superseded", supersededBy?: string) {
      const values: Partial<typeof episodes.$inferInsert> = { status };
      if (supersededBy) values.supersededBy = supersededBy;
      return db.update(episodes).set(values).where(eq(episodes.id, id)).returning().get();
    },
  };
}

export type EpisodesRepository = ReturnType<typeof createEpisodesRepository>;
