import React from "react";
import { Box, Text } from "ink";
import { theme } from "../theme.js";

interface InspectorPanelProps {
  title: string;
  content: string;
  visible: boolean;
}

export function InspectorPanel({ title, content, visible }: InspectorPanelProps) {
  if (!visible || !content) return null;
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.frame}
      paddingX={1}
      marginTop={0}
    >
      <Box>
        <Text bold color={theme.title}>{title}</Text>
      </Box>
      <Box flexDirection="column">
        {content.split("\n").map((line, i) => (
          <Text key={i}>{line}</Text>
        ))}
      </Box>
    </Box>
  );
}
