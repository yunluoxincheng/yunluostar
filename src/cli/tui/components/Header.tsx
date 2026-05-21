import React from "react";
import { Box, Text } from "ink";
import { theme } from "../theme.js";

interface HeaderProps {
  version: string;
  provider: string;
  model: string;
  sessionId: string;
}

export function Header({ version, provider, model, sessionId }: HeaderProps) {
  const modelLabel = model === "default" ? provider : `${provider} / ${model}`;
  return (
    <Box flexDirection="column" marginBottom={0}>
      <Box>
        <Text bold color={theme.title}>
          {"YUNLUOSTAR"}
        </Text>
        <Text> </Text>
        <Text color={theme.quiet}>v{version}</Text>
        <Text> </Text>
        <Text color={theme.accent}>consciousness-like agent</Text>
      </Box>
      <Box>
        <Text color={theme.quiet}>{"  model "}</Text>
        <Text color={theme.accent}>{modelLabel}</Text>
        <Text color={theme.quiet}>{" · session "}</Text>
        <Text color={theme.goal}>{sessionId}</Text>
      </Box>
    </Box>
  );
}
