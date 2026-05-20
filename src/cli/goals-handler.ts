import { loadConfig } from "../config.js";
import { createDbConnection, closeDbConnection } from "../db/connection.js";
import { runMigrations } from "../db/migrate.js";
import { createGoalsRepository } from "../db/goals-repository.js";
import { createAuditLogRepository } from "../db/audit-log-repository.js";
import { createGoalManager } from "../planning/goal-manager.js";

const TYPE_ORDER: Record<string, number> = {
  core: 0,
  long_term: 1,
  medium_term: 2,
  short_term: 3,
  operational: 4,
};

const TYPE_LABELS: Record<string, string> = {
  core: "CORE",
  long_term: "LONG",
  medium_term: "MED",
  short_term: "SHORT",
  operational: "OPS",
};

const STATUS_ICONS: Record<string, string> = {
  active: "●",
  suggested: "○",
  paused: "◷",
  completed: "✓",
  rejected: "✗",
  deprecated: "—",
};

export async function handleGoalsList(options: {
  json?: boolean;
  status?: string;
  type?: string;
}): Promise<void> {
  const config = loadConfig();
  const db = createDbConnection(config.databasePath);
  try {
    runMigrations(db);
    const repo = createGoalsRepository(db);
    let items = repo.findAll();

    if (options.status) {
      items = items.filter((g) => g.status === options.status);
    }
    if (options.type) {
      items = items.filter((g) => g.type === options.type);
    }

    // Sort by type order, then priority desc
    items.sort((a, b) => {
      const typeDiff = (TYPE_ORDER[a.type] ?? 99) - (TYPE_ORDER[b.type] ?? 99);
      if (typeDiff !== 0) return typeDiff;
      return b.priority - a.priority;
    });

    if (options.json) {
      console.log(JSON.stringify({ items, total: items.length }, null, 2));
    } else {
      const active = items.filter((g) => g.status === "active").length;
      const suggested = items.filter((g) => g.status === "suggested").length;
      console.log(`\nGoals (${items.length} total, ${active} active, ${suggested} suggested):\n`);

      let currentType = "";
      for (const g of items) {
        if (g.type !== currentType) {
          currentType = g.type;
          console.log(`  ${TYPE_LABELS[g.type] ?? g.type}:`);
        }

        const icon = STATUS_ICONS[g.status] ?? "?";
        const approval = g.requiresApproval && g.status === "suggested" ? " [needs approval]" : "";
        const conflict = g.conflictOf ? ` [conflicts with ${g.conflictOf.slice(0, 8)}]` : "";
        const mutability = !g.mutable ? " (immutable)" : "";
        console.log(`    ${icon} ${g.description} (p:${g.priority.toFixed(1)}${mutability}${approval}${conflict})`);
      }

      console.log("");
    }
  } finally {
    closeDbConnection(db);
  }
}

export async function handleGoalTransition(
  goalId: string,
  action: "approve" | "reject" | "pause" | "complete",
): Promise<void> {
  const config = loadConfig();
  const db = createDbConnection(config.databasePath);
  try {
    runMigrations(db);
    const goalsRepo = createGoalsRepository(db);
    const auditRepo = createAuditLogRepository(db);
    const goalManager = createGoalManager(goalsRepo, auditRepo);

    const result = goalManager.transitionGoal(goalId, action);

    if (result.success) {
      console.log(`\n  Goal ${goalId} ${action}d successfully.\n`);
    } else {
      console.error(`\n  Failed to ${action} goal ${goalId}: ${result.reason}\n`);
      process.exitCode = 1;
    }
  } finally {
    closeDbConnection(db);
  }
}
