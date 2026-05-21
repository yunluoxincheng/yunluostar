import { eq, desc, and } from "drizzle-orm";
import type { DbClient } from "./connection.js";
import { reflections } from "./schema.js";
import type { DataScope } from "./scope.js";
import { withScope } from "./scope.js";

export function createReflectionsRepository(db: DbClient, scope?: DataScope) {
  const scoped = scope
    ? and(eq(reflections.userId, scope.userId), eq(reflections.workspaceId, scope.workspaceId))
    : undefined;

  return {
    insert(reflection: typeof reflections.$inferInsert) {
      return db.insert(reflections).values(withScope(reflection, scope)).returning().get();
    },

    findById(id: string) {
      return db.select().from(reflections).where(scoped ? and(eq(reflections.id, id), scoped) : eq(reflections.id, id)).get();
    },

    findByEpisodeId(episodeId: string) {
      const condition = scoped ? and(eq(reflections.episodeId, episodeId), scoped) : eq(reflections.episodeId, episodeId);
      return db
        .select()
        .from(reflections)
        .where(condition)
        .get();
    },

    findRecent(limit = 20) {
      let query = db
        .select()
        .from(reflections)
        .$dynamic();
      if (scoped) query = query.where(scoped);
      return query.orderBy(desc(reflections.createdAt))
        .limit(limit)
        .all();
    },
  };
}

export type ReflectionsRepository = ReturnType<typeof createReflectionsRepository>;
