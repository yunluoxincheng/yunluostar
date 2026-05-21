import React from "react";
import { Box, Text, Static } from "ink";
import { theme } from "../theme.js";

export interface ConversationEntry {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  streaming?: boolean;
}

interface ConversationViewProps {
  entries: ConversationEntry[];
}

export function ConversationView({ entries }: ConversationViewProps) {
  if (entries.length === 0) return null;

  const streamingIndex = entries.findIndex((e) => e.streaming);
  const hasStreaming = streamingIndex !== -1;

  // Completed history goes into Static (rendered once, never re-drawn).
  // The streaming entry is rendered outside Static so Ink re-renders it.
  const history = hasStreaming ? entries.slice(0, streamingIndex) : entries;
  const streamingEntry = hasStreaming ? entries[streamingIndex] : null;

  return (
    <Box flexDirection="column" marginTop={0}>
      {history.length > 0 && (
        <Static items={history}>
          {(entry) => <EntryRenderer key={entry.id} entry={entry} />}
        </Static>
      )}
      {streamingEntry && <EntryRenderer entry={streamingEntry} />}
    </Box>
  );
}

function EntryRenderer({ entry }: { entry: ConversationEntry }) {
  if (entry.role === "user") {
    return (
      <Box>
        <Text color={theme.goal}>{"you :: "}</Text>
        <Text>{entry.content}</Text>
      </Box>
    );
  }
  if (entry.role === "assistant") {
    return (
      <Box flexDirection="column">
        <Box>
          <Text color={theme.accent}>{"response ─ "}</Text>
        </Box>
        <Box marginLeft={2}>
          <Text>{entry.content}{entry.streaming ? "█" : ""}</Text>
        </Box>
      </Box>
    );
  }
  return (
    <Box>
      <Text color={theme.quiet}>{entry.content}</Text>
    </Box>
  );
}
