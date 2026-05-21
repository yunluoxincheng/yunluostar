import { useState, useCallback, useRef } from "react";
import type { AppConfig } from "../../../config.js";
import { createDbConnection, closeDbConnection } from "../../../db/connection.js";
import { runMigrations } from "../../../db/migrate.js";
import { createLLMClient, createEmbeddingClient } from "../../../llm/factory.js";
import { createAgentController } from "../../../agent/controller.js";
import type { PipelineStage } from "../../../agent/controller.js";
import { InteractiveRouter, STAGE_LABELS } from "../../interactive-router.js";
import type { ConversationEntry } from "../components/ConversationView.js";

export interface ChatResult {
  response: string;
  trace: {
    episodeId: string;
    reflectionId?: string;
    recalledMemoryIds: string[];
    appliedUserModelIds: string[];
    appliedSelfModelIds: string[];
    restoredSnapshotId?: string;
    savedSnapshotId?: string;
    selectedGoalId?: string;
    suggestedGoalIds?: string[];
  };
}

export interface AgentState {
  processing: boolean;
  stage: string;
  lastTrace: ChatResult["trace"] | null;
  error: string | null;
}

export function useInteractiveAgent(config: AppConfig) {
  const routerRef = useRef(new InteractiveRouter(config));
  const [entries, setEntries] = useState<ConversationEntry[]>([]);
  const [agentState, setAgentState] = useState<AgentState>({
    processing: false,
    stage: "",
    lastTrace: null,
    error: null,
  });

  const sessionId = routerRef.current.getSessionId();

  const processSlashCommand = useCallback(async (input: string): Promise<{ exit: boolean; output?: string }> => {
    const result = await routerRef.current.route(input);
    if (result.action === "exit") return { exit: true };
    if (result.output) return { exit: false, output: result.output };
    return { exit: false };
  }, []);

  const sendChat = useCallback(async (message: string) => {
    const userEntry: ConversationEntry = {
      id: `user-${Date.now()}`,
      role: "user",
      content: message,
    };
    const assistantId = `assistant-${Date.now()}`;
    setEntries((prev: ConversationEntry[]) => [...prev, userEntry]);

    setAgentState((prev: AgentState) => ({ ...prev, processing: true, stage: "starting...", error: null }));

    const db = createDbConnection(config.databasePath);
    try {
      runMigrations(db);
      const llm = createLLMClient(config.provider, config);
      const embeddingClient = createEmbeddingClient();
      const agent = createAgentController(llm, db, embeddingClient);

      let fullResponse = "";

      setEntries((prev: ConversationEntry[]) => [...prev, { id: assistantId, role: "assistant", content: "", streaming: true }]);

      const result = await agent.chat(message, {
        sessionId,
        onToken: (token: string) => {
          fullResponse += token;
          setEntries((prev: ConversationEntry[]) =>
            prev.map((e: ConversationEntry) =>
              e.id === assistantId
                ? { ...e, content: fullResponse }
                : e,
            ),
          );
        },
        onStage: (stage: PipelineStage) => {
          const label = STAGE_LABELS[stage];
          if (label) {
            setAgentState((prev: AgentState) => ({ ...prev, stage: label }));
          }
        },
      });

      setEntries((prev: ConversationEntry[]) =>
        prev.map((e: ConversationEntry) =>
          e.id === assistantId
            ? { ...e, content: result.response, streaming: false }
            : e,
        ),
      );

      setAgentState({
        processing: false,
        stage: "",
        lastTrace: result.trace,
        error: null,
      });
    } catch (err) {
      const msg = (err as Error).message;
      setAgentState((prev: AgentState) => ({ ...prev, processing: false, stage: "", error: msg }));
      setEntries((prev: ConversationEntry[]) => prev.filter((e: ConversationEntry) => e.id !== assistantId));
    } finally {
      closeDbConnection(db);
    }
  }, [config, sessionId]);

  const addInspectorEntry = useCallback((content: string) => {
    setEntries((prev: ConversationEntry[]) => [
      ...prev,
      { id: `inspector-${Date.now()}`, role: "system", content },
    ]);
  }, []);

  const addErrorEntry = useCallback((message: string) => {
    setEntries((prev: ConversationEntry[]) => [
      ...prev,
      { id: `error-${Date.now()}`, role: "system", content: `Error: ${message}` },
    ]);
  }, []);

  return {
    entries,
    agentState,
    sessionId,
    sendChat,
    processSlashCommand,
    addInspectorEntry,
    addErrorEntry,
    router: routerRef.current,
  };
}
