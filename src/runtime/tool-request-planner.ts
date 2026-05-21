import { toolRequestSchema, type ToolRequest } from "../protocol/runtime.js";
import { generateId } from "../models/defaults.js";

const TOOL_COMMAND_PATTERN = /^tool:([a-z_]+)\s+(.+)$/s;

export function planToolRequest(input: string): ToolRequest | null {
  const match = input.trim().match(TOOL_COMMAND_PATTERN);
  if (!match) return null;

  const [, name, rawParams] = match;
  let params: Record<string, unknown>;
  try {
    params = JSON.parse(rawParams) as Record<string, unknown>;
  } catch {
    params = { path: rawParams.trim() };
  }

  return toolRequestSchema.parse({
    id: generateId(),
    name,
    params,
    reason: "Explicit runtime tool request from chat input.",
    risk: ["read_file", "search", "git_status", "git_diff"].includes(name) ? "low" : "medium",
  });
}
