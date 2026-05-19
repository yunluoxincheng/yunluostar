import { eq, desc, and } from "drizzle-orm";
import type { DbClient } from "./connection.js";
import { episodes } from "./schema.js";

export function createEpisodesRepository(db: DbClient) {
  return {
    insert(episode: typeof episodes.$inferInsert) {
      return db.insert(episodes).values(episode).returning().get();
    },

    findById(id: string) {
      return db.select().from(episodes).where(eq(episodes.id, id)).get();
    },

    findBySession(sessionId: string, limit = 20) {
      return db
        .select()
        .from(episodes)
        .where(eq(episodes.sessionId, sessionId))
        .orderBy(desc(episodes.timestamp))
        .limit(limit)
        .all();
    },

    findRecentActive(limit = 20) {
      return db
        .select()
        .from(episodes)
        .where(eq(episodes.status, "active"))
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
