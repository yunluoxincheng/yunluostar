import { describe, it, expect } from "vitest";
import { getAllCommands } from "../../src/cli/command-registry.js";
import { formatHelp } from "../../src/cli/tui.js";

describe("slash-command help from registry", () => {
  it("formatHelp contains every registered command name", () => {
    const help = formatHelp();
    for (const cmd of getAllCommands()) {
      expect(help).toContain(cmd.name);
    }
  });

  it("formatHelp contains every registered command description", () => {
    const help = formatHelp();
    for (const cmd of getAllCommands()) {
      expect(help).toContain(cmd.description);
    }
  });

  it("formatHelp contains alias for commands with aliases", () => {
    const help = formatHelp();
    const exitCmd = getAllCommands().find((c) => c.name === "/exit");
    if (exitCmd?.aliases?.length) {
      for (const alias of exitCmd.aliases) {
        expect(help).toContain(alias);
      }
    }
  });
});
