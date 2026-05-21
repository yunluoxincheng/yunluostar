import { z } from "zod";

export const pluginManifestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string().default(""),
  capabilities: z.array(z.string()).default([]),
});

export type PluginManifest = z.infer<typeof pluginManifestSchema>;
