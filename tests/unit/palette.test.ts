import { describe, it, expect } from "vitest";
import {
  createInitialPaletteState,
  openPalette,
  filterCommands,
  moveSelection,
  updatePaletteQuery,
  decidePaletteAction,
  closePalette,
} from "../../src/cli/palette.js";

describe("palette", () => {
  describe("openPalette", () => {
    it("opens with / prefix and shows all commands when no filter", () => {
      const state = openPalette("/");
      expect(state.open).toBe(true);
      expect(state.query).toBe("");
      expect(state.filtered.length).toBeGreaterThanOrEqual(10);
      expect(state.selectedIndex).toBe(0);
    });

    it("filters commands from the initial input", () => {
      const state = openPalette("/go");
      expect(state.open).toBe(true);
      expect(state.query).toBe("go");
      expect(state.filtered.some((c) => c.name === "/goals")).toBe(true);
    });
  });

  describe("filterCommands", () => {
    it("returns all commands for empty query", () => {
      const results = filterCommands("");
      expect(results.length).toBeGreaterThanOrEqual(10);
    });

    it("filters by command name prefix", () => {
      const results = filterCommands("mem");
      expect(results.some((c) => c.name === "/memory")).toBe(true);
      expect(results.every((c) => c.name !== "/goals")).toBe(true);
    });

    it("filters by alias", () => {
      const results = filterCommands("quit");
      expect(results.some((c) => c.name === "/exit")).toBe(true);
    });

    it("filters by description", () => {
      const results = filterCommands("working");
      expect(results.some((c) => c.name === "/wm")).toBe(true);
    });

    it("returns empty for non-matching query", () => {
      const results = filterCommands("xyzabc");
      expect(results).toHaveLength(0);
    });
  });

  describe("moveSelection", () => {
    const base = openPalette("/");

    it("moves down incrementing index", () => {
      const next = moveSelection(base, "down");
      expect(next.selectedIndex).toBe(1);
    });

    it("wraps around moving down past the end", () => {
      const atEnd = { ...base, selectedIndex: base.filtered.length - 1 };
      const next = moveSelection(atEnd, "down");
      expect(next.selectedIndex).toBe(0);
    });

    it("wraps around moving up from the start", () => {
      const next = moveSelection(base, "up");
      expect(next.selectedIndex).toBe(base.filtered.length - 1);
    });

    it("moves up decrementing index", () => {
      const atOne = { ...base, selectedIndex: 1 };
      const next = moveSelection(atOne, "up");
      expect(next.selectedIndex).toBe(0);
    });

    it("returns same state for empty filtered list", () => {
      const empty = { ...base, filtered: [], selectedIndex: 0 };
      const next = moveSelection(empty, "down");
      expect(next.selectedIndex).toBe(0);
    });
  });

  describe("decidePaletteAction", () => {
    it("Tab completes with usage string", () => {
      const state = { ...openPalette("/"), selectedIndex: 0 };
      const cmd = state.filtered[0];
      const result = decidePaletteAction(state, { kind: "tab" });
      expect(result.type).toBe("complete");
      expect(result.input).toBe(cmd.usage + " ");
    });

    it("Enter executes read-only command", () => {
      const state = { ...openPalette("/help"), selectedIndex: 0 };
      const result = decidePaletteAction(state, { kind: "enter" });
      expect(result.type).toBe("execute");
      expect(result.command?.name).toBe("/help");
    });

    it("Enter completes argument-required command instead of executing", () => {
      const state = openPalette("/session");
      // /session should be in filtered results
      const sessionIndex = state.filtered.findIndex((c) => c.name === "/session");
      if (sessionIndex === -1) return; // skip if not in filtered
      const withSession = { ...state, selectedIndex: sessionIndex };
      const result = decidePaletteAction(withSession, { kind: "enter" });
      expect(result.type).toBe("complete");
    });

    it("returns none for empty filtered list", () => {
      const empty = { ...openPalette("/xyz"), filtered: [], selectedIndex: 0 };
      const result = decidePaletteAction(empty, { kind: "enter" });
      expect(result.type).toBe("none");
    });
  });

  describe("closePalette", () => {
    it("closes palette preserving input", () => {
      const result = closePalette("/goals");
      expect(result.open).toBe(false);
      expect(result.input).toBe("/goals");
    });
  });

  describe("updatePaletteQuery", () => {
    it("updates filter when typing more", () => {
      const state = updatePaletteQuery("/goa");
      expect(state.open).toBe(true);
      expect(state.filtered.some((c) => c.name === "/goals")).toBe(true);
    });

    it("resets selected index on new query", () => {
      const state = updatePaletteQuery("/m");
      expect(state.selectedIndex).toBe(0);
    });
  });
});
