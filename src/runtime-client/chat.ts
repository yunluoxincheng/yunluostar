import type { AppConfig } from "../config.js";
import { chatRequestSchema, type ChatRequest } from "../protocol/runtime.js";
import { collectWorkspaceContext } from "./workspace-context.js";

export function createChatRequest(
  config: AppConfig,
  input: string,
  sessionId: string,
  cwd = process.cwd(),
): ChatRequest {
  return chatRequestSchema.parse({
    requestId: `req-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    sessionId,
    input,
    workspace: collectWorkspaceContext(config, cwd),
    client: {
      streaming: true,
      localTools: ["read_file", "write_file", "search", "shell", "git_status", "git_diff", "apply_patch", "edit_file"],
      protocolVersion: "1",
    },
  });
}
