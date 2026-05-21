import { describe, expect, it } from "vitest";
import { existsSync, mkdirSync, readFileSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { executeLocalToolRequest } from "../../src/runtime-client/tool-executor.js";
import type { ToolRequest } from "../../src/protocol/runtime.js";

function tempWorkspace(): string {
  const dir = resolve(tmpdir(), `yunluo-tool-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(dir);
  return dir;
}

describe("local tool executor", () => {
  it("denies unapproved tool requests without executing them", async () => {
    const cwd = tempWorkspace();
    const file = resolve(cwd, "blocked.txt");
    const request: ToolRequest = {
      id: "tool-1",
      name: "write_file",
      params: { path: "blocked.txt", content: "secret" },
      risk: "medium",
    };

    const result = await executeLocalToolRequest("req-1", request, { cwd, approved: false });

    expect(result.status).toBe("denied");
    expect(existsSync(file)).toBe(false);
  });

  it("reads workspace files and blocks paths outside the workspace", async () => {
    const cwd = tempWorkspace();
    const file = resolve(cwd, "note.txt");
    writeFileSync(file, "hello", "utf-8");

    const readRequest: ToolRequest = {
      id: "tool-1",
      name: "read_file",
      params: { path: "note.txt" },
      risk: "low",
    };
    const outsideRequest: ToolRequest = {
      id: "tool-2",
      name: "read_file",
      params: { path: "..\\outside.txt" },
      risk: "low",
    };

    const readResult = await executeLocalToolRequest("req-1", readRequest, { cwd, approved: true });
    const outsideResult = await executeLocalToolRequest("req-1", outsideRequest, { cwd, approved: true });

    expect(readResult.output).toBe("hello");
    expect(outsideResult.status).toBe("failed");
    unlinkSync(file);
  });

  it("blocks symlink and junction escapes when reading files", async () => {
    const cwd = tempWorkspace();
    const outside = tempWorkspace();
    writeFileSync(resolve(outside, "secret.txt"), "outside secret", "utf-8");
    symlinkSync(outside, resolve(cwd, "linked-outside"), "junction");
    const request: ToolRequest = {
      id: "tool-1",
      name: "read_file",
      params: { path: "linked-outside/secret.txt" },
      risk: "low",
    };

    const result = await executeLocalToolRequest("req-1", request, { cwd, approved: true });

    expect(result.status).toBe("failed");
    expect(result.error).toContain("outside the workspace");
  });

  it("blocks writes through symlink and junction escapes", async () => {
    const cwd = tempWorkspace();
    const outside = tempWorkspace();
    writeFileSync(resolve(outside, "secret.txt"), "outside secret", "utf-8");
    symlinkSync(outside, resolve(cwd, "linked-outside"), "junction");
    const request: ToolRequest = {
      id: "tool-1",
      name: "write_file",
      params: { path: "linked-outside/secret.txt", content: "changed" },
      risk: "medium",
    };

    const result = await executeLocalToolRequest("req-1", request, { cwd, approved: true });

    expect(result.status).toBe("failed");
    expect(result.error).toContain("outside the workspace");
    expect(readFileSync(resolve(outside, "secret.txt"), "utf-8")).toBe("outside secret");
  });

  it("writes and edits files after approval", async () => {
    const cwd = tempWorkspace();
    const file = resolve(cwd, "edit.txt");
    const writeRequest: ToolRequest = {
      id: "tool-1",
      name: "write_file",
      params: { path: "edit.txt", content: "alpha beta" },
      risk: "medium",
    };
    const editRequest: ToolRequest = {
      id: "tool-2",
      name: "edit_file",
      params: { path: "edit.txt", find: "beta", replace: "gamma" },
      risk: "medium",
    };

    expect((await executeLocalToolRequest("req-1", writeRequest, { cwd, approved: true })).status).toBe("approved");
    expect((await executeLocalToolRequest("req-1", editRequest, { cwd, approved: true })).status).toBe("approved");
    expect(readFileSync(file, "utf-8")).toBe("alpha gamma");
    unlinkSync(file);
  });

  it("applies approved patches inside the workspace", async () => {
    const cwd = tempWorkspace();
    const file = resolve(cwd, "patch.txt");
    writeFileSync(file, "before\n", "utf-8");
    const request: ToolRequest = {
      id: "tool-1",
      name: "apply_patch",
      params: {
        patch: [
          "diff --git a/patch.txt b/patch.txt",
          "index 1a826d8..d8263ee 100644",
          "--- a/patch.txt",
          "+++ b/patch.txt",
          "@@ -1 +1 @@",
          "-before",
          "+after",
          "",
        ].join("\n"),
      },
      risk: "medium",
    };

    const result = await executeLocalToolRequest("req-1", request, { cwd, approved: true });

    expect(result.status).toBe("approved");
    expect(readFileSync(file, "utf-8").replace(/\r\n/g, "\n")).toBe("after\n");
    unlinkSync(file);
  });
});
