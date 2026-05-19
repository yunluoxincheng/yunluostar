import { desc, and, eq } from "drizzle-orm";
import type { DbClient } from "./connection.js";
import { auditLogs } from "./schema.js";

export function createAuditLogRepository(db: DbClient) {
  return {
    insert(entry: typeof auditLogs.$inferInsert) {
      return db.insert(auditLogs).values(entry).returning().get();
    },

    findByTarget(targetTable: string, targetId: string) {
      return db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.targetTable, targetTable),
            eq(auditLogs.targetId, targetId),
          ),
        )
        .orderBy(desc(auditLogs.timestamp))
        .all();
    },

    findRecent(limit = 50) {
      return db
        .select()
        .from(auditLogs)
        .orderBy(desc(auditLogs.timestamp))
        .limit(limit)
        .all();
    },
  };
}

export type AuditLogRepository = ReturnType<typeof createAuditLogRepository>;
