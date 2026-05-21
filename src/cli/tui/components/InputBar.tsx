import React from "react";
import { Box, Text } from "ink";
import { theme } from "../theme.js";

interface InputBarProps {
  value: string;
  disabled?: boolean;
  placeholder?: string;
}

export function InputBar({ value, disabled, placeholder }: InputBarProps) {
  const displayValue = value || "";
  const displayPlaceholder = !displayValue && placeholder ? placeholder : "";

  return (
    <Box>
      <Text color={theme.accent}>{"yunluo"}</Text>
      <Text color={theme.frame}>{" :: "}</Text>
      <Text bold>{"> "}</Text>
      {displayValue ? (
        <Text>{displayValue}{disabled ? "" : "█"}</Text>
      ) : (
        <Text color={theme.quiet}>{displayPlaceholder}</Text>
      )}
    </Box>
  );
}
