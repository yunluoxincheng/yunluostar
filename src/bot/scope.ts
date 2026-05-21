import type { BotScope, BotMessageRequest } from "./protocol.js";
import type { DataScope } from "../db/scope.js";

function deriveStableSessionId(request: BotMessageRequest): string {
  return `bot:${request.platformId}:${request.adapterId}:${request.conversationId}:${request.senderUserId}`;
}

export function botScopeFromRequest(request: BotMessageRequest): BotScope {
  return {
    platformId: request.platformId,
    adapterId: request.adapterId,
    conversationId: request.conversationId,
    senderUserId: request.senderUserId,
    sessionId: request.sessionId || deriveStableSessionId(request),
  };
}

export function botScopeToDataScope(botScope: BotScope): DataScope {
  return {
    userId: `bot:${botScope.platformId}:${botScope.senderUserId}`,
    workspaceId: `bot:${botScope.platformId}:${botScope.adapterId}:${botScope.conversationId}`,
  };
}

export function deriveSessionId(botScope: BotScope): string {
  return botScope.sessionId;
}
