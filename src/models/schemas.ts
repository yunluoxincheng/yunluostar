import { z } from "zod";

export const chatInputSchema = z.object({
  message: z.string().trim().min(1, "Message must not be empty"),
  session: z.string().optional(),
});

export const chatTraceSchema = z.object({
  episodeId: z.string(),
  reflectionId: z.string().optional(),
  recalledMemoryIds: z.array(z.string()).default([]),
  appliedUserModelIds: z.array(z.string()).default([]),
  appliedSelfModelIds: z.array(z.string()).default([]),
});

export const chatResultSchema = z.object({
  response: z.string(),
  trace: chatTraceSchema,
});

export const inspectionOutputSchema = z.object({
  items: z.array(z.record(z.unknown())),
  total: z.number(),
});

export type ChatInput = z.infer<typeof chatInputSchema>;
export type ChatTrace = z.infer<typeof chatTraceSchema>;
export type ChatResult = z.infer<typeof chatResultSchema>;
export type InspectionOutput = z.infer<typeof inspectionOutputSchema>;
