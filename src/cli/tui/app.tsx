import React, { useState, useCallback } from "react";
import { render as inkRender, Box, Text, useApp, useInput } from "ink";
import { Header } from "./components/Header.js";
import { ConversationView } from "./components/ConversationView.js";
import { InputBar } from "./components/InputBar.js";
import { CommandPalette } from "./components/CommandPalette.js";
import { StatusLine } from "./components/StatusLine.js";
import { TraceLine } from "./components/TraceLine.js";
import { ErrorBox } from "./components/ErrorBox.js";
import { useCommandPalette } from "./hooks/useCommandPalette.js";
import { useInteractiveAgent } from "./hooks/useInteractiveAgent.js";
import { theme } from "./theme.js";
import { formatHelp } from "../tui.js";
import type { AppConfig } from "../../config.js";

interface KeyShape {
  return?: boolean;
  backspace?: boolean;
  delete?: boolean;
  escape?: boolean;
  tab?: boolean;
  upArrow?: boolean;
  downArrow?: boolean;
  ctrl?: boolean;
  meta?: boolean;
}

const CLOSED_PALETTE = { open: false, query: "", filtered: [] as never[], selectedIndex: 0 };

function isTab(key: KeyShape, ch: string): boolean {
  return !!key.tab || ch === "\t";
}

function isReturn(key: KeyShape, ch: string): boolean {
  return !!key.return || ch === "\r" || ch === "\n";
}

interface AppProps {
  config: AppConfig;
  version: string;
}

function YunluoApp({ config, version }: AppProps) {
  const { exit } = useApp();
  const [input, setInput] = useState("");
  const { palette, onInputChange, onUp, onDown, onEscape } = useCommandPalette();
  const modelLabel = config.model ?? "default";
  const {
    entries,
    agentState,
    sessionId,
    sendChat,
    processSlashCommand,
    addInspectorEntry,
  } = useInteractiveAgent(config);

  const handleSubmit = useCallback(async (value: string): Promise<void> => {
    const trimmed = value.trim();
    setInput("");
    if (!trimmed) return;

    if (trimmed === "/exit" || trimmed === "/quit") {
      exit();
      return;
    }

    if (trimmed.startsWith("/")) {
      if (trimmed === "/help") {
        addInspectorEntry(formatHelp());
        return;
      }
      const result = await processSlashCommand(trimmed);
      if (result.exit) {
        exit();
        return;
      }
      if (result.output) {
        addInspectorEntry(result.output);
      }
      return;
    }

    await sendChat(trimmed);
  }, [exit, sendChat, processSlashCommand, addInspectorEntry]);

  useInput((inputChar: string, key: KeyShape) => {
    if (key.ctrl && inputChar === "c") {
      exit();
      return;
    }

    if (agentState.processing) return;

    if (palette.open) {
      if (key.upArrow) { onUp(); return; }
      if (key.downArrow) { onDown(); return; }

      if (isTab(key, inputChar)) {
        const cmd = palette.filtered[palette.selectedIndex];
        if (cmd) {
          setInput(cmd.usage + " ");
          onInputChange(cmd.usage + " ");
        }
        return;
      }

      if (key.escape) {
        const preserved = onEscape();
        setInput(preserved);
        return;
      }

      if (isReturn(key, inputChar)) {
        const cmd = palette.filtered[palette.selectedIndex];
        if (cmd) {
          if (cmd.requiresArgument) {
            setInput(cmd.usage + " ");
            onInputChange(cmd.usage + " ");
          } else {
            setInput("");
            onInputChange("");
            void handleSubmit(cmd.name);
          }
        } else {
          setInput("");
          onInputChange("");
          void handleSubmit(input);
        }
        return;
      }

      if (key.backspace || key.delete) {
        const next = input.slice(0, -1);
        setInput(next);
        onInputChange(next);
        return;
      }
      if (inputChar && !key.ctrl && !key.meta && !key.upArrow && !key.downArrow && !isTab(key, inputChar) && !isReturn(key, inputChar)) {
        const next = input + inputChar;
        setInput(next);
        onInputChange(next);
      }
      return;
    }

    if (isReturn(key, inputChar)) {
      void handleSubmit(input);
      return;
    }
    if (key.backspace || key.delete) {
      setInput((prev: string) => prev.slice(0, -1));
      return;
    }
    if (inputChar && !key.ctrl && !key.meta && !key.upArrow && !key.downArrow && !isReturn(key, inputChar)) {
      const next = input + inputChar;
      setInput(next);
      onInputChange(next);
    }
  });

  return (
    <Box flexDirection="column">
      <Header
        version={version}
        provider={config.provider}
        model={modelLabel}
        sessionId={sessionId}
      />
      <ConversationView entries={entries} />
      <StatusLine stage={agentState.stage} visible={agentState.processing} />
      {agentState.lastTrace && (
        <TraceLine
          episodeId={agentState.lastTrace.episodeId}
          reflectionId={agentState.lastTrace.reflectionId}
          memoryCount={agentState.lastTrace.recalledMemoryIds.length}
          userModelCount={agentState.lastTrace.appliedUserModelIds.length}
          selfModelCount={agentState.lastTrace.appliedSelfModelIds.length}
          hasWorkingMemory={!!(agentState.lastTrace.restoredSnapshotId || agentState.lastTrace.savedSnapshotId)}
          goalId={agentState.lastTrace.selectedGoalId}
          suggestedGoalCount={agentState.lastTrace.suggestedGoalIds?.length}
        />
      )}
      <ErrorBox message={agentState.error} />
      <CommandPalette state={palette} />
      <InputBar
        value={input}
        disabled={agentState.processing}
        placeholder="type a message or / for commands..."
      />
    </Box>
  );
}

export function renderTui(config: AppConfig): { waitUntilExit: () => Promise<void> } {
  const instance = inkRender(<YunluoApp config={config} version="0.1.0" />, {
    exitOnCtrlC: false,
  });
  return { waitUntilExit: instance.waitUntilExit as () => Promise<void> };
}
