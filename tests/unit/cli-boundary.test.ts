import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const CLI_ROOT = resolve(process.cwd(), "src", "cli");
const RUNTIME_CLIENT_ENTRY = resolve(process.cwd(), "src", "runtime-client", "client.ts");
const FORBIDDEN_DIRECT_IMPORTS = [
  "../db/",
  "../../db/",
  "../../../db/",
  "../llm/",
  "../../llm/",
  "../../../llm/",
  "../agent/",
  "../../agent/",
  "../../../agent/",
  "../runtime/",
  "../../runtime/",
  "../../../runtime/",
];

function listSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = resolve(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) files.push(...listSourceFiles(full));
    if (stat.isFile() && /\.(ts|tsx)$/.test(entry)) files.push(full);
  }
  return files;
}

describe("CLI/runtime boundary", () => {
  it("prevents CLI code from directly importing agent or provider modules", () => {
    const offenders = listSourceFiles(CLI_ROOT).flatMap((file) => {
      const content = readFileSync(file, "utf-8");
      return FORBIDDEN_DIRECT_IMPORTS
        .filter((specifier) => content.includes(`"${specifier}`) || content.includes(`'${specifier}`))
        .map((specifier) => `${file}: ${specifier}`);
    });

    expect(offenders).toEqual([]);
  });

  it("keeps the main runtime-client entry free of runtime implementation imports", () => {
    const content = readFileSync(RUNTIME_CLIENT_ENTRY, "utf-8");

    expect(content).not.toContain("../runtime/");
  });
});
