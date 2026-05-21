import React from "react";
import { Box, Text } from "ink";
import { theme } from "../theme.js";

interface StatusLineProps {
  stage: string;
  visible: boolean;
}

export function StatusLine({ stage, visible }: StatusLineProps) {
  if (!visible || !stage) return null;
  return (
    <Box>
      <Text color={theme.accent}>{"⠋"}</Text>
      <Text color={theme.quiet}>{` ${stage}`}</Text>
    </Box>
  );
}
