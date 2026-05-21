import { z } from "zod";
import { chatResultSchema, chatTraceSchema } from "../models/schemas.js";

export const pipelineStageSchema = z.enum([
  "restoring",
  "awakening",
  "thinking",
  "recording",
  "reflecting",
  "consolidating",
  "correcting",
  "saving",
  "done",
]);

export const runtimeModeSchema = z.enum(["embedded", "local", "hosted"]);

export const workspaceContextFileSchema = z.object({
  path: z.string(),
  kind: z.enum(["instruction", "source", "summary"]).default("source"),
  content: z.string().optional(),
  summary: z.string().optional(),
});

export const workspaceContextSchema = z.object({
  workspaceId: z.string(),
  rootPath: z.string(),
  instructionFiles: z.array(workspaceContextFileSchema).default([]),
});

export const clientCapabilitiesSchema = z.object({
  streaming: z.boolean().default(true),
  localTools: z.array(z.string()).default([]),
  protocolVersion: z.literal("1").default("1"),
});

export const chatRequestSchema = z.object({
  requestId: z.string().min(1),
  sessionId: z.string().min(1),
  input: z.string().trim().min(1),
  workspace: workspaceContextSchema.optional(),
  client: clientCapabilitiesSchema.default({}),
});

export const toolRequestSchema = z.object({
  id: z.string().min(1),
  name: z.enum(["read_file", "write_file", "search", "shell", "git_status", "git_diff", "apply_patch", "edit_file"]),
  reason: z.string().optional(),
  params: z.record(z.unknown()).default({}),
  risk: z.enum(["low", "medium", "high"]).default("medium"),
});

export const toolResultSchema = z.object({
  requestId: z.string().min(1),
  toolRequestId: z.string().min(1),
  status: z.enum(["approved", "denied", "failed"]),
  output: z.string().optional(),
  error: z.string().optional(),
});

export const runtimeEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("stage"),
    requestId: z.string(),
    stage: pipelineStageSchema,
  }),
  z.object({
    type: z.literal("token"),
    requestId: z.string(),
    token: z.string(),
  }),
  z.object({
    type: z.literal("tool_request"),
    requestId: z.string(),
    toolRequest: toolRequestSchema,
  }),
  z.object({
    type: z.literal("final"),
    requestId: z.string(),
    result: chatResultSchema,
  }),
  z.object({
    type: z.literal("error"),
    requestId: z.string(),
    code: z.string(),
    message: z.string(),
  }),
]);

export const runtimeStatusSchema = z.object({
  ok: z.boolean(),
  mode: runtimeModeSchema,
  version: z.string(),
  provider: z.string(),
  providerReady: z.boolean(),
  embeddingReady: z.boolean(),
  authRequired: z.boolean(),
  storage: z.object({
    driver: z.literal("sqlite"),
    ownedByRuntime: z.literal(true),
  }),
});

export const sessionStateSchema = z.object({
  sessionId: z.string(),
  latestTrace: chatTraceSchema.optional(),
  workingMemory: z.record(z.unknown()).optional(),
});

export const runtimeListResponseSchema = z.object({
  items: z.array(z.record(z.unknown())),
  total: z.number().int().nonnegative(),
});

export const loginRequestSchema = z.object({
  mode: z.enum(["hosted", "local"]).default("hosted"),
  token: z.string().optional(),
});

export const loginResponseSchema = z.object({
  status: z.enum(["ok", "instructions"]),
  token: z.string().optional(),
  message: z.string(),
});

export type PipelineStage = z.infer<typeof pipelineStageSchema>;
export type RuntimeMode = z.infer<typeof runtimeModeSchema>;
export type WorkspaceContext = z.infer<typeof workspaceContextSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type RuntimeEvent = z.infer<typeof runtimeEventSchema>;
export type RuntimeStatus = z.infer<typeof runtimeStatusSchema>;
export type RuntimeListResponse = z.infer<typeof runtimeListResponseSchema>;
export type SessionState = z.infer<typeof sessionStateSchema>;
export type ToolRequest = z.infer<typeof toolRequestSchema>;
export type ToolResult = z.infer<typeof toolResultSchema>;
