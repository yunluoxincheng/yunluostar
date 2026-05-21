import type { ChatRequest } from "../protocol/runtime.js";
import type { DataScope } from "../db/scope.js";
import { DEFAULT_DATA_SCOPE } from "../db/scope.js";

export function scopeFromWorkspace(workspaceId?: string, userId?: string): DataScope {
  return {
    userId: userId ?? DEFAULT_DATA_SCOPE.userId,
    workspaceId: workspaceId ?? DEFAULT_DATA_SCOPE.workspaceId,
  };
}

export function scopeFromChatRequest(request: ChatRequest, userId?: string): DataScope {
  return scopeFromWorkspace(request.workspace?.workspaceId, userId);
}
