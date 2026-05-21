import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { existsSync, mkdtempSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { readAuthFile, writeAuthFile, clearAuthFile } from "../../src/auth/token-store.js";
import { redactRecord } from "../../src/security/redaction.js";
import { configSchema } from "../../src/config.js";
import { resolvePermissionDecision } from "../../src/runtime-client/permissions.js";
import type { ToolRequest } from "../../src/protocol/runtime.js";

describe("auth token store", () => {
  it("writes, reads, and clears a runtime auth token file", () => {
    const dir = mkdtempSync(resolve(tmpdir(), "yunluo-auth-"));
    const filePath = resolve(dir, "auth.json");

    writeAuthFile({ runtimeUrl: "http://127.0.0.1:3927", token: "runtime-token" }, filePath);
    expect(readAuthFile(filePath)?.token).toBe("runtime-token");
    expect(clearAuthFile(filePath)).toBe(true);
    expect(existsSync(filePath)).toBe(false);
  });
});

describe("redaction", () => {
  it("redacts nested tokens, authorization headers, and provider secrets", () => {
    const redacted = redactRecord({
      apiKey: "sk-1234567890",
      headers: { Authorization: "Bearer abcdefghijklmnop" },
      providerConfig: { secret: "secret-value" },
      safe: "visible",
    });

    expect(redacted.apiKey).toMatch(/\*+/);
    expect((redacted.headers as Record<string, string>).Authorization).toMatch(/\*+/);
    expect((redacted.providerConfig as Record<string, string>).secret).toMatch(/\*+/);
    expect(redacted.safe).toBe("visible");
  });
});

describe("permission policy", () => {
  it("defaults risky local tools to ask", () => {
    const config = configSchema.parse({});
    const request: ToolRequest = {
      id: "tool-1",
      name: "write_file",
      params: {},
      risk: "medium",
    };

    expect(resolvePermissionDecision(request, config)).toBe("ask");
  });

  it("does not auto-allow destructive shell commands", () => {
    const config = configSchema.parse({ permissionPolicy: { shell: "allow" } });
    const request: ToolRequest = {
      id: "tool-1",
      name: "shell",
      params: { command: "Remove-Item target -Recurse" },
      risk: "high",
    };

    expect(resolvePermissionDecision(request, config)).toBe("ask");
  });
});
