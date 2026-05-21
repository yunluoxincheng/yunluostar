import React from "react";
import { Box, Text } from "ink";
import { theme } from "../theme.js";

interface ErrorBoxProps {
  message: string | null;
}

export function ErrorBox({ message }: ErrorBoxProps) {
  if (!message) return null;
  return (
    <Box>
      <Text color={theme.error}>{"x "}</Text>
      <Text bold color={theme.error}>{"TUI error"}</Text>
      <Text color={theme.quiet}>{" :: "}</Text>
      <Text>{message}</Text>
    </Box>
  );
}
