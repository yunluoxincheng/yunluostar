import { describe, it, expect } from "vitest";
import {
  getAllCommands,
  findCommand,
  isKnownCommand,
  suggestSimilar,
} from "../../src/cli/command-registry.js";

describe("command-registry", () => {
  describe("getAllCommands", () => {
    it("returns non-empty array with all expected commands", () => {
      const cmds = getAllCommands();
      expect(cmds.length).toBeGreaterThanOrEqual(10);
      const names = cmds.map((c) => c.name);
      expect(names).toContain("/help");
      expect(names).toContain("/exit");
      expect(names).toContain("/model");
      expect(names).toContain("/config");
      expect(names).toContain("/session");
      expect(names).toContain("/memory");
      expect(names).toContain("/self");
      expect(names).toContain("/goals");
      expect(names).toContain("/reflections");
      expect(names).toContain("/wm");
    });

    it("every command has required metadata fields", () => {
      for (const cmd of getAllCommands()) {
        expect(cmd.name).toMatch(/^\//);
        expect(cmd.description).toBeTruthy();
        expect(cmd.category).toBeTruthy();
        expect(cmd.usage).toBeTruthy();
        expect(typeof cmd.readOnly).toBe("boolean");
        expect(typeof cmd.requiresArgument).toBe("boolean");
      }
    });
  });

  describe("findCommand", () => {
    it("finds command by exact name", () => {
      expect(findCommand("/help")?.name).toBe("/help");
      expect(findCommand("/goals")?.name).toBe("/goals");
    });

    it("finds command by alias", () => {
      expect(findCommand("/quit")?.name).toBe("/exit");
    });

    it("is case-insensitive", () => {
      expect(findCommand("/HELP")?.name).toBe("/help");
      expect(findCommand("/Exit")?.name).toBe("/exit");
    });

    it("returns undefined for unknown commands", () => {
      expect(findCommand("/unknown")).toBeUndefined();
      expect(findCommand("/xyz")).toBeUndefined();
    });
  });

  describe("isKnownCommand", () => {
    it("returns true for known commands", () => {
      expect(isKnownCommand("/help")).toBe(true);
      expect(isKnownCommand("/quit")).toBe(true);
    });

    it("returns false for unknown commands", () => {
      expect(isKnownCommand("/unknown")).toBe(false);
    });
  });

  describe("suggestSimilar", () => {
    it("suggests commands with similar prefixes", () => {
      const results = suggestSimilar("/go");
      expect(results.some((r) => r.name === "/goals")).toBe(true);
    });

    it("returns empty array for completely unrelated input", () => {
      const results = suggestSimilar("/xyzabc");
      expect(results).toHaveLength(0);
    });

    it("respects maxResults", () => {
      const results = suggestSimilar("/", 2);
      expect(results.length).toBeLessThanOrEqual(2);
    });
  });
});
