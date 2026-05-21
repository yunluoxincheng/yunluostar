import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const episodes = sqliteTable("episodes", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("local-user"),
  workspaceId: text("workspace_id").notNull().default("default-workspace"),
  sessionId: text("session_id").notNull(),
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull(),
  userInput: text("user_input").notNull(),
  agentResponse: text("agent_response").notNull(),
  intent: text("intent"),
  action: text("action"),
  outcome: text("outcome"),
  lesson: text("lesson"),
  importance: real("importance").notNull().default(0.5),
  confidence: real("confidence").notNull().default(0.5),
  status: text("status", { enum: ["active", "deprecated", "superseded"] }).notNull().default("active"),
  supersededBy: text("superseded_by"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const semanticMemories = sqliteTable("semantic_memories", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("local-user"),
  workspaceId: text("workspace_id").notNull().default("default-workspace"),
  sourceEpisodeId: text("source_episode_id").references(() => episodes.id),
  content: text("content").notNull(),
  category: text("category"),
  importance: real("importance").notNull().default(0.5),
  confidence: real("confidence").notNull().default(0.5),
  status: text("status", { enum: ["active", "deprecated", "superseded"] }).notNull().default("active"),
  supersededBy: text("superseded_by"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const userModel = sqliteTable("user_model", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("local-user"),
  workspaceId: text("workspace_id").notNull().default("default-workspace"),
  key: text("key").notNull(),
  value: text("value").notNull(),
  evidence: text("evidence").notNull(),
  confidence: real("confidence").notNull().default(0.5),
  status: text("status", { enum: ["active", "deprecated", "superseded"] }).notNull().default("active"),
  supersededBy: text("superseded_by"),
  sourceEpisodeId: text("source_episode_id").references(() => episodes.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const selfModel = sqliteTable("self_model", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("local-user"),
  workspaceId: text("workspace_id").notNull().default("default-workspace"),
  trait: text("trait").notNull(),
  value: text("value").notNull(),
  evidence: text("evidence").notNull(),
  confidence: real("confidence").notNull().default(0.5),
  mutable: integer("mutable", { mode: "boolean" }).notNull().default(true),
  status: text("status", { enum: ["active", "deprecated", "superseded"] }).notNull().default("active"),
  supersededBy: text("superseded_by"),
  sourceEpisodeId: text("source_episode_id").references(() => episodes.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const GOAL_TYPES = ["core", "long_term", "medium_term", "short_term", "operational"] as const;
export type GoalType = (typeof GOAL_TYPES)[number];

export const GOAL_STATUSES = ["suggested", "active", "paused", "completed", "rejected", "deprecated"] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

export const goals = sqliteTable("goals", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("local-user"),
  workspaceId: text("workspace_id").notNull().default("default-workspace"),
  description: text("description").notNull(),
  type: text("type", { enum: [...GOAL_TYPES] }).notNull().default("long_term"),
  status: text("status", { enum: [...GOAL_STATUSES] }).notNull().default("active"),
  priority: real("priority").notNull().default(0.5),
  mutable: integer("mutable", { mode: "boolean" }).notNull().default(true),
  requiresApproval: integer("requires_approval", { mode: "boolean" }).notNull().default(false),
  approvedAt: integer("approved_at", { mode: "timestamp" }),
  sourceEpisodeId: text("source_episode_id").references(() => episodes.id),
  evidence: text("evidence"),
  rationale: text("rationale"),
  conflictOf: text("conflict_of"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const reflections = sqliteTable("reflections", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("local-user"),
  workspaceId: text("workspace_id").notNull().default("default-workspace"),
  episodeId: text("episode_id").references(() => episodes.id).notNull(),
  whatWorked: text("what_worked"),
  whatFailed: text("what_failed"),
  lessons: text("lessons"),
  updateCandidates: text("update_candidates"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("local-user"),
  workspaceId: text("workspace_id").notNull().default("default-workspace"),
  targetTable: text("target_table").notNull(),
  targetId: text("target_id").notNull(),
  action: text("action", { enum: ["create", "update", "deprecate", "supersede", "confidence_lower", "approve", "reject", "pause", "complete", "conflict"] }).notNull(),
  beforeValue: text("before_value"),
  afterValue: text("after_value"),
  reason: text("reason"),
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const workingMemorySnapshots = sqliteTable("working_memory_snapshots", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("local-user"),
  workspaceId: text("workspace_id").notNull().default("default-workspace"),
  sessionId: text("session_id").notNull(),
  snapshot: text("snapshot").notNull(),
  episodeId: text("episode_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
