import type { AppConfig } from "../config.js";
import type { ToolRequest } from "../protocol/runtime.js";

export type PermissionDecision = "allow" | "ask" | "deny";

const TOOL_POLICY_KEY: Record<ToolRequest["name"], keyof AppConfig["permissionPolicy"]> = {
  read_file: "readFile",
  write_file: "writeFile",
  search: "search",
  shell: "shell",
  git_status: "gitStatus",
  git_diff: "gitDiff",
  apply_patch: "applyPatch",
  edit_file: "editFile",
};

const DESTRUCTIVE_SHELL_PATTERN = /\b(rm\s+-r|rm\s+-rf|Remove-Item\b.*-Recurse|del\s+\/s|rmdir\s+\/s|rd\s+\/s|git\s+reset\s+--hard|git\s+clean\s+-fd|git\s+push\s+--force)\b/i;

export function resolvePermissionDecision(request: ToolRequest, config: AppConfig): PermissionDecision {
  if (request.name === "shell") {
    const command = typeof request.params.command === "string" ? request.params.command : "";
    if (DESTRUCTIVE_SHELL_PATTERN.test(command)) return "ask";
  }
  const policyKey = TOOL_POLICY_KEY[request.name];
  return config.permissionPolicy[policyKey] ?? "ask";
}
