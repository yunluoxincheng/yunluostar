import type { PluginManifest } from "./manifest.js";
import type { BotMessageRequest, BotMessageResponse } from "../bot/protocol.js";

export type MessageHook = "message.received" | "message.responding" | "memory.created" | "goal.suggested" | "tool.requested";

export interface PluginHookContext {
  request: BotMessageRequest;
  response?: BotMessageResponse;
}

export type HookHandler = (context: PluginHookContext) => Promise<PluginHookResult | void>;

export interface PluginHookResult {
  output?: unknown;
}

export interface PluginInterface {
  manifest: PluginManifest;
  hooks: Partial<Record<MessageHook, HookHandler>>;
  commands?: Record<string, (args: string[], context: PluginHookContext) => Promise<string>>;
}

export function createPluginInterface(
  manifest: PluginManifest,
  hooks?: Partial<Record<MessageHook, HookHandler>>,
  commands?: Record<string, (args: string[], context: PluginHookContext) => Promise<string>>,
): PluginInterface {
  return { manifest, hooks: hooks ?? {}, commands };
}
