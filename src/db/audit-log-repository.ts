import { desc, and, eq } from "drizzle-orm";
import type { DbClient } from "./connection.js";
import { auditLogs } from "./schema.js";
import type { DataScope } from "./scope.js";
import { withScope } from "./scope.js";

export function createAuditLogRepository(db: DbClient, scope?: DataScope) {
  const scoped = scope
    ? and(eq(auditLogs.userId, scope.userId), eq(auditLogs.workspaceId, scope.workspaceId))
    : undefined;

  return {
    insert(entry: typeof auditLogs.$inferInsert) {
      return db.insert(auditLogs).values(withScope(entry, scope)).returning().get();
    },

    findByTarget(targetTable: string, targetId: string) {
      const condition = scoped
        ? and(eq(auditLogs.targetTable, targetTable), eq(auditLogs.targetId, targetId), scoped)
        : and(eq(auditLogs.targetTable, targetTable), eq(auditLogs.targetId, targetId));
      return db
        .select()
        .from(auditLogs)
        .where(condition)
        .orderBy(desc(auditLogs.timestamp))
        .all();
    },

    findRecent(limit = 50) {
      let query = db
        .select()
        .from(auditLogs)
        .$dynamic();
      if (scoped) query = query.where(scoped);
      return query.orderBy(desc(auditLogs.timestamp))
        .limit(limit)
        .all();
    },
  };
}

export type AuditLogRepository = ReturnType<typeof createAuditLogRepository>;
