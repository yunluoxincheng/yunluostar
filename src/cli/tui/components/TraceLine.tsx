import React from "react";
import { Box, Text } from "ink";
import { theme } from "../theme.js";

interface TraceLineProps {
  episodeId?: string;
  reflectionId?: string;
  memoryCount?: number;
  userModelCount?: number;
  selfModelCount?: number;
  hasWorkingMemory?: boolean;
  goalId?: string;
  suggestedGoalCount?: number;
}

export function TraceLine({
  episodeId,
  reflectionId,
  memoryCount,
  userModelCount,
  selfModelCount,
  hasWorkingMemory,
  goalId,
  suggestedGoalCount,
}: TraceLineProps) {
  const parts: { text: string; color: string }[] = [];

  if (episodeId) parts.push({ text: `ep ${episodeId.slice(0, 8)}`, color: theme.quiet });
  if (reflectionId) parts.push({ text: `rf ${reflectionId.slice(0, 8)}`, color: theme.quiet });
  if (memoryCount && memoryCount > 0) parts.push({ text: `memories ${memoryCount}`, color: theme.memory });
  if (userModelCount && userModelCount > 0) parts.push({ text: `user ${userModelCount}`, color: theme.world });
  if (selfModelCount && selfModelCount > 0) parts.push({ text: `self ${selfModelCount}`, color: theme.self });
  if (hasWorkingMemory) parts.push({ text: "wm", color: theme.world });
  if (goalId) parts.push({ text: `goal ${goalId.slice(0, 8)}`, color: theme.goal });
  if (suggestedGoalCount && suggestedGoalCount > 0) parts.push({ text: `+${suggestedGoalCount} suggested`, color: theme.goal });

  if (parts.length === 0) return null;

  return (
    <Box>
      <Text color={theme.quiet}>{"  "}</Text>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {i > 0 && <Text color={theme.frame}>{" · "}</Text>}
          <Text color={part.color}>{part.text}</Text>
        </React.Fragment>
      ))}
    </Box>
  );
}
