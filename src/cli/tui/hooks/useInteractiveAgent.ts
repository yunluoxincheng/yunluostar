import { useState, useCallback, useRef } from "react";
import type { AppConfig } from "../../../config.js";
import { createRuntimeClient } from "../../../runtime-client/client.js";
import { createChatRequest } from "../../../runtime-client/chat.js";
import { resolvePermissionDecision } from "../../../runtime-client/permissions.js";
import { executeLocalToolRequest } from "../../../runtime-client/tool-executor.js";
import { toolResultSchema, type PipelineStage, type ToolRequest } from "../../../protocol/runtime.js";
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

export interface PendingToolApproval {
  runtimeRequestId: string;
  toolRequest: ToolRequest;
}

export function useInteractiveAgent(config: AppConfig) {
  const routerRef = useRef(new InteractiveRouter(config));
  const [entries, setEntries] = useState<ConversationEntry[]>([]);
  const [pendingToolApprovals, setPendingToolApprovals] = useState<PendingToolApproval[]>([]);
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

    try {
      const client = createRuntimeClient(config);
      const request = createChatRequest(config, message, sessionId);

      let fullResponse = "";

      setEntries((prev: ConversationEntry[]) => [...prev, { id: assistantId, role: "assistant", content: "", streaming: true }]);

      const result = await client.chat(request, {
        onEvent: (event) => {
          if (event.type === "token") {
            fullResponse += event.token;
            setEntries((prev: ConversationEntry[]) =>
              prev.map((e: ConversationEntry) =>
                e.id === assistantId
                  ? { ...e, content: fullResponse }
                  : e,
              ),
            );
          }
          if (event.type === "stage") {
            const label = STAGE_LABELS[event.stage as PipelineStage];
            if (label) {
              setAgentState((prev: AgentState) => ({ ...prev, stage: label }));
            }
          }
          if (event.type === "tool_request") {
            const decision = resolvePermissionDecision(event.toolRequest, config);
            if (decision === "ask") {
              setPendingToolApprovals((prev) => [
                ...prev.filter((item) => item.toolRequest.id !== event.toolRequest.id),
                { runtimeRequestId: event.requestId, toolRequest: event.toolRequest },
              ]);
              setEntries((prev: ConversationEntry[]) => [
                ...prev,
                {
                  id: `tool-${event.toolRequest.id}`,
                  role: "system",
                  content: `Tool approval required: ${event.toolRequest.id} ${event.toolRequest.name} ${JSON.stringify(event.toolRequest.params)}. Use /approve ${event.toolRequest.id} or /deny ${event.toolRequest.id}.`,
                },
              ]);
              return;
            }
            void executeLocalToolRequest(event.requestId, event.toolRequest, { approved: decision === "allow" })
              .then((toolResult) => client.sendToolResult(toolResult))
              .catch((error) => {
                setEntries((prev: ConversationEntry[]) => [
                  ...prev,
                  { id: `tool-error-${Date.now()}`, role: "system", content: `Tool result failed: ${(error as Error).message}` },
                ]);
              });
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
    }
  }, [config, sessionId]);

  const resolveToolApproval = useCallback(async (toolRequestId: string, approved: boolean): Promise<string> => {
    const pending = pendingToolApprovals.find((item) => item.toolRequest.id === toolRequestId);
    if (!pending) return `No pending tool request: ${toolRequestId}`;

    const client = createRuntimeClient(config);
    const result = approved
      ? await executeLocalToolRequest(pending.runtimeRequestId, pending.toolRequest, { approved: true })
      : toolResultSchema.parse({
        requestId: pending.runtimeRequestId,
        toolRequestId: pending.toolRequest.id,
        status: "denied",
        error: "Denied by user approval command.",
      });
    await client.sendToolResult(result);
    setPendingToolApprovals((prev) => prev.filter((item) => item.toolRequest.id !== toolRequestId));
    return approved
      ? `Tool ${toolRequestId} approved: ${result.status}${result.error ? ` (${result.error})` : ""}`
      : `Tool ${toolRequestId} denied.`;
  }, [config, pendingToolApprovals]);

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
    pendingToolApprovals,
    sessionId,
    sendChat,
    processSlashCommand,
    resolveToolApproval,
    addInspectorEntry,
    addErrorEntry,
    router: routerRef.current,
  };
}
