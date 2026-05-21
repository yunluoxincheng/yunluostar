import { z } from "zod";

export const botScopeSchema = z.object({
  platformId: z.string().min(1),
  adapterId: z.string().min(1),
  conversationId: z.string().min(1),
  senderUserId: z.string().min(1),
  sessionId: z.string().min(1),
});

export const botMessageRequestSchema = z.object({
  platformId: z.string().min(1),
  adapterId: z.string().min(1),
  conversationId: z.string().min(1),
  senderUserId: z.string().min(1),
  sessionId: z.string().optional(),
  text: z.string().trim().min(1),
  messageId: z.string().optional(),
  timestamp: z.string().datetime({ offset: true }).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const pluginEventTraceSchema = z.object({
  pluginId: z.string(),
  hook: z.string(),
  durationMs: z.number(),
  output: z.unknown().optional(),
});

export const botMessageResponseSchema = z.object({
  responseText: z.string(),
  traceId: z.string(),
  sessionId: z.string(),
  episodeId: z.string().optional(),
  reflectionId: z.string().optional(),
  memoryIds: z.array(z.string()).default([]),
  goalIds: z.array(z.string()).default([]),
  pluginEvents: z.array(pluginEventTraceSchema).default([]),
});

export const botStreamStageSchema = z.enum([
  "received",
  "awakening",
  "thinking",
  "recording",
  "reflecting",
  "consolidating",
  "done",
]);

export const botStreamEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("stage"),
    traceId: z.string(),
    stage: botStreamStageSchema,
  }),
  z.object({
    type: z.literal("token"),
    traceId: z.string(),
    token: z.string(),
  }),
  z.object({
    type: z.literal("plugin"),
    traceId: z.string(),
    event: pluginEventTraceSchema,
  }),
  z.object({
    type: z.literal("final"),
    traceId: z.string(),
    response: botMessageResponseSchema,
  }),
  z.object({
    type: z.literal("error"),
    traceId: z.string(),
    code: z.string(),
    message: z.string(),
  }),
]);

export type BotScope = z.infer<typeof botScopeSchema>;
export type BotMessageRequest = z.infer<typeof botMessageRequestSchema>;
export type BotMessageResponse = z.infer<typeof botMessageResponseSchema>;
export type BotStreamEvent = z.infer<typeof botStreamEventSchema>;
export type BotStreamStage = z.infer<typeof botStreamStageSchema>;
export type PluginEventTrace = z.infer<typeof pluginEventTraceSchema>;
