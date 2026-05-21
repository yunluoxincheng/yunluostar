import type { SlashCommandDefinition } from "./command-registry.js";
import { getAllCommands } from "./command-registry.js";

export interface PaletteState {
  open: boolean;
  query: string;
  filtered: SlashCommandDefinition[];
  selectedIndex: number;
}

export function createInitialPaletteState(): PaletteState {
  return {
    open: false,
    query: "",
    filtered: [...getAllCommands()],
    selectedIndex: 0,
  };
}

export function openPalette(input: string): PaletteState {
  const query = input.startsWith("/") ? input.slice(1) : "";
  const filtered = filterCommands(query);
  return {
    open: true,
    query,
    filtered,
    selectedIndex: 0,
  };
}

export function filterCommands(query: string): SlashCommandDefinition[] {
  if (!query) return [...getAllCommands()];
  const lower = query.toLowerCase();
  return getAllCommands().filter((cmd) => {
    if (cmd.name.toLowerCase().includes(lower)) return true;
    if (cmd.aliases?.some((a) => a.toLowerCase().includes(lower))) return true;
    if (cmd.usage.toLowerCase().includes(lower)) return true;
    if (cmd.description.toLowerCase().includes(lower)) return true;
    return false;
  });
}

export function moveSelection(
  state: PaletteState,
  direction: "up" | "down",
): PaletteState {
  if (state.filtered.length === 0) return state;
  let next = state.selectedIndex;
  if (direction === "up") {
    next = state.selectedIndex > 0
      ? state.selectedIndex - 1
      : state.filtered.length - 1;
  } else {
    next = state.selectedIndex < state.filtered.length - 1
      ? state.selectedIndex + 1
      : 0;
  }
  return { ...state, selectedIndex: next };
}

export function updatePaletteQuery(input: string): PaletteState {
  const query = input.startsWith("/") ? input.slice(1) : "";
  const filtered = filterCommands(query);
  return {
    open: true,
    query,
    filtered,
    selectedIndex: Math.min(0, filtered.length - 1),
  };
}

export type PaletteAction =
  | { kind: "tab" }
  | { kind: "enter" };

export interface PaletteDecision {
  type: "complete" | "execute" | "none";
  input: string;
  command?: SlashCommandDefinition;
}

export function decidePaletteAction(
  state: PaletteState,
  action: PaletteAction,
): PaletteDecision {
  if (state.filtered.length === 0) return { type: "none", input: "" };

  const cmd = state.filtered[state.selectedIndex];
  if (!cmd) return { type: "none", input: "" };

  if (action.kind === "tab") {
    return { type: "complete", input: cmd.usage + " ", command: cmd };
  }

  // Enter
  if (cmd.requiresArgument) {
    return { type: "complete", input: cmd.usage + " ", command: cmd };
  }
  return { type: "execute", input: cmd.name, command: cmd };
}

export function closePalette(input: string): { open: false; input: string } {
  return { open: false, input };
}
