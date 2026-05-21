import { existsSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import type { AppConfig } from "../config.js";
import type { WorkspaceContext } from "../protocol/runtime.js";

const MAX_CONTEXT_BYTES = 64 * 1024;

function safeReadContextFile(root: string, relativePath: string): { path: string; content: string } | null {
  const fullPath = resolve(root, relativePath);
  const rel = relative(resolve(root), fullPath);
  if (rel.startsWith("..") || isAbsolute(rel)) return null;
  if (!existsSync(fullPath)) return null;
  const stat = statSync(fullPath);
  if (!stat.isFile() || stat.size > MAX_CONTEXT_BYTES) return null;
  return {
    path: relativePath,
    content: readFileSync(fullPath, "utf-8"),
  };
}

export function collectWorkspaceContext(config: AppConfig, cwd = process.cwd()): WorkspaceContext {
  const instructionFiles = config.contextFiles
    .map((file) => safeReadContextFile(cwd, file))
    .filter((file): file is { path: string; content: string } => !!file)
    .map((file) => ({
      path: file.path,
      kind: "instruction" as const,
      content: file.content,
    }));

  return {
    workspaceId: resolve(cwd),
    rootPath: resolve(cwd),
    instructionFiles,
  };
}
