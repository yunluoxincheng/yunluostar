import React from "react";
import { Box, Text } from "ink";
import { theme, CATEGORY_COLORS } from "../theme.js";
import type { SlashCommandDefinition } from "../../command-registry.js";
import type { PaletteState } from "../../palette.js";

interface CommandPaletteProps {
  state: PaletteState;
}

export function CommandPalette({ state }: CommandPaletteProps) {
  if (!state.open || state.filtered.length === 0) return null;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.frame}
      paddingX={1}
      marginTop={0}
    >
      {state.filtered.map((cmd, idx) => (
        <PaletteItem
          key={cmd.name}
          command={cmd}
          selected={idx === state.selectedIndex}
        />
      ))}
      <Box marginTop={0}>
        <Text dimColor>
          {"↑↓ navigate · Tab complete · Enter execute · Esc close"}
        </Text>
      </Box>
    </Box>
  );
}

function PaletteItem({
  command,
  selected,
}: {
  command: SlashCommandDefinition;
  selected: boolean;
}) {
  const color = CATEGORY_COLORS[command.category] ?? theme.accent;
  const prefix = selected ? "› " : "  ";
  const label = command.aliases?.length
    ? `${command.name} (${command.aliases.join(", ")})`
    : command.name;

  return (
    <Box>
      <Text>{prefix}</Text>
      <Text bold={selected} color={selected ? color : undefined}>
        {label}
      </Text>
      <Text dimColor>{" — "}</Text>
      <Text dimColor>{command.description}</Text>
    </Box>
  );
}
