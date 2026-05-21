import { existsSync, lstatSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { spawn } from "node:child_process";
import { toolResultSchema, type ToolRequest, type ToolResult } from "../protocol/runtime.js";

export interface ToolExecutionOptions {
  cwd?: string;
  approved: boolean;
}

const MAX_OUTPUT_BYTES = 128 * 1024;

function isWithin(root: string, path: string): boolean {
  const rel = relative(root, path);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function workspacePath(cwd: string, requestedPath: unknown): { root: string; fullPath: string } {
  if (typeof requestedPath !== "string" || requestedPath.trim().length === 0) {
    throw new Error("Tool request requires a non-empty path.");
  }
  const root = resolve(cwd);
  const fullPath = resolve(root, requestedPath);
  if (!isWithin(root, fullPath)) {
    throw new Error(`Path is outside the workspace: ${requestedPath}`);
  }
  return { root, fullPath };
}

function existingWorkspacePath(cwd: string, requestedPath: unknown): string {
  const { root, fullPath } = workspacePath(cwd, requestedPath);
  const rootReal = realpathSync.native(root);
  const targetReal = realpathSync.native(fullPath);
  if (!isWithin(rootReal, targetReal)) {
    throw new Error(`Path resolves outside the workspace: ${requestedPath}`);
  }
  return targetReal;
}

function writableWorkspacePath(cwd: string, requestedPath: unknown): string {
  const { root, fullPath } = workspacePath(cwd, requestedPath);
  const rootReal = realpathSync.native(root);
  if (existsSync(fullPath)) {
    const linkInfo = lstatSync(fullPath);
    if (linkInfo.isSymbolicLink()) {
      throw new Error(`Refusing to write through a symbolic link: ${requestedPath}`);
    }
    const targetReal = realpathSync.native(fullPath);
    if (!isWithin(rootReal, targetReal)) {
      throw new Error(`Path resolves outside the workspace: ${requestedPath}`);
    }
    return fullPath;
  }

  const parentReal = realpathSync.native(resolve(fullPath, ".."));
  if (!isWithin(rootReal, parentReal)) {
    throw new Error(`Path parent resolves outside the workspace: ${requestedPath}`);
  }
  return fullPath;
}

function truncateOutput(output: string): string {
  if (Buffer.byteLength(output, "utf-8") <= MAX_OUTPUT_BYTES) return output;
  return output.slice(0, MAX_OUTPUT_BYTES) + "\n[truncated]";
}

async function runCommand(command: string, args: string[], cwd: string, input?: string): Promise<string> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd,
      shell: false,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString("utf-8"); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf-8"); });
    child.on("error", rejectPromise);
    child.on("close", (code) => {
      const output = truncateOutput([stdout, stderr].filter(Boolean).join("\n"));
      if (code === 0) resolvePromise(output);
      else rejectPromise(new Error(output || `Command exited with code ${code}`));
    });
    if (input !== undefined) {
      child.stdin.end(input, "utf-8");
    }
  });
}

async function executeApprovedTool(request: ToolRequest, cwd: string): Promise<string> {
  switch (request.name) {
    case "read_file": {
      const path = existingWorkspacePath(cwd, request.params.path);
      if (!existsSync(path) || !statSync(path).isFile()) throw new Error(`File not found: ${request.params.path}`);
      return truncateOutput(readFileSync(path, "utf-8"));
    }
    case "write_file": {
      const path = writableWorkspacePath(cwd, request.params.path);
      const content = typeof request.params.content === "string" ? request.params.content : "";
      writeFileSync(path, content, "utf-8");
      return `Wrote ${Buffer.byteLength(content, "utf-8")} bytes to ${request.params.path}`;
    }
    case "edit_file": {
      const path = writableWorkspacePath(cwd, request.params.path);
      const find = request.params.find;
      const replace = request.params.replace;
      if (typeof find !== "string" || typeof replace !== "string") {
        throw new Error("edit_file requires string find and replace parameters.");
      }
      const current = readFileSync(path, "utf-8");
      if (!current.includes(find)) throw new Error("edit_file find text was not present.");
      const next = current.replace(find, replace);
      writeFileSync(path, next, "utf-8");
      return `Edited ${request.params.path}`;
    }
    case "search": {
      const query = request.params.query;
      if (typeof query !== "string" || query.trim().length === 0) throw new Error("search requires query.");
      return runCommand("rg", ["--", query], cwd);
    }
    case "git_status":
      return runCommand("git", ["status", "--short"], cwd);
    case "git_diff":
      return runCommand("git", ["diff", "--", "."], cwd);
    case "shell": {
      const command = request.params.command;
      if (typeof command !== "string" || command.trim().length === 0) throw new Error("shell requires command.");
      return runCommand(process.platform === "win32" ? "powershell.exe" : "sh", process.platform === "win32"
        ? ["-NoProfile", "-Command", command]
        : ["-lc", command], cwd);
    }
    case "apply_patch":
      if (typeof request.params.patch !== "string" || request.params.patch.trim().length === 0) {
        throw new Error("apply_patch requires a non-empty patch parameter.");
      }
      return runCommand("git", ["apply", "--whitespace=nowarn", "-"], cwd, request.params.patch);
    default:
      throw new Error(`Unsupported tool request: ${(request as ToolRequest).name}`);
  }
}

export async function executeLocalToolRequest(
  runtimeRequestId: string,
  request: ToolRequest,
  options: ToolExecutionOptions,
): Promise<ToolResult> {
  if (!options.approved) {
    return toolResultSchema.parse({
      requestId: runtimeRequestId,
      toolRequestId: request.id,
      status: "denied",
      error: "Tool request was not approved by policy or user decision.",
    });
  }

  try {
    const output = await executeApprovedTool(request, resolve(options.cwd ?? process.cwd()));
    return toolResultSchema.parse({
      requestId: runtimeRequestId,
      toolRequestId: request.id,
      status: "approved",
      output,
    });
  } catch (error) {
    return toolResultSchema.parse({
      requestId: runtimeRequestId,
      toolRequestId: request.id,
      status: "failed",
      error: (error as Error).message,
    });
  }
}
