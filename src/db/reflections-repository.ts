import { eq, desc } from "drizzle-orm";
import type { DbClient } from "./connection.js";
import { reflections } from "./schema.js";

export function createReflectionsRepository(db: DbClient) {
  return {
    insert(reflection: typeof reflections.$inferInsert) {
      return db.insert(reflections).values(reflection).returning().get();
    },

    findById(id: string) {
      return db.select().from(reflections).where(eq(reflections.id, id)).get();
    },

    findByEpisodeId(episodeId: string) {
      return db
        .select()
        .from(reflections)
        .where(eq(reflections.episodeId, episodeId))
        .get();
    },

    findRecent(limit = 20) {
      return db
        .select()
        .from(reflections)
        .orderBy(desc(reflections.createdAt))
        .limit(limit)
        .all();
    },
  };
}

export type ReflectionsRepository = ReturnType<typeof createReflectionsRepository>;
