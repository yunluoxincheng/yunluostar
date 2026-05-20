import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const episodes = sqliteTable("episodes", {
  id: text("id").primaryKey(),
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

export const goals = sqliteTable("goals", {
  id: text("id").primaryKey(),
  description: text("description").notNull(),
  priority: real("priority").notNull().default(0.5),
  status: text("status", { enum: ["active", "completed", "paused", "deprecated"] }).notNull().default("active"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const reflections = sqliteTable("reflections", {
  id: text("id").primaryKey(),
  episodeId: text("episode_id").references(() => episodes.id).notNull(),
  whatWorked: text("what_worked"),
  whatFailed: text("what_failed"),
  lessons: text("lessons"),
  updateCandidates: text("update_candidates"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  targetTable: text("target_table").notNull(),
  targetId: text("target_id").notNull(),
  action: text("action", { enum: ["create", "update", "deprecate", "supersede", "confidence_lower"] }).notNull(),
  beforeValue: text("before_value"),
  afterValue: text("after_value"),
  reason: text("reason"),
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const workingMemorySnapshots = sqliteTable("working_memory_snapshots", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  snapshot: text("snapshot").notNull(),
  episodeId: text("episode_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
