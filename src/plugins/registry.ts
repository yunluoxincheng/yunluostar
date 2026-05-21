import { pluginManifestSchema, type PluginManifest } from "./manifest.js";
import type { PluginInterface, MessageHook, HookHandler, PluginHookContext } from "./hooks.js";
import type { PluginEventTrace } from "../bot/protocol.js";

export interface PluginRegistry {
  register(plugin: PluginInterface): void;
  getPlugins(): PluginManifest[];
  runHook(hook: MessageHook, context: PluginHookContext): Promise<PluginEventTrace[]>;
}

export function createPluginRegistry(): PluginRegistry {
  const plugins = new Map<string, PluginInterface>();

  return {
    register(plugin: PluginInterface): void {
      const validated = pluginManifestSchema.parse(plugin.manifest);
      if (plugins.has(validated.id)) {
        throw new Error(`Plugin "${validated.id}" is already registered.`);
      }
      plugins.set(validated.id, plugin);
    },

    getPlugins(): PluginManifest[] {
      return Array.from(plugins.values()).map((p) => ({ ...p.manifest }));
    },

    async runHook(hook: MessageHook, context: PluginHookContext): Promise<PluginEventTrace[]> {
      const traces: PluginEventTrace[] = [];
      for (const [id, plugin] of plugins) {
        const handler = plugin.hooks[hook];
        if (!handler) continue;
        const start = Date.now();
        try {
          const result = await handler(context);
          traces.push({
            pluginId: id,
            hook,
            durationMs: Date.now() - start,
            output: result?.output,
          });
        } catch (error) {
          traces.push({
            pluginId: id,
            hook,
            durationMs: Date.now() - start,
            output: { error: (error as Error).message },
          });
        }
      }
      return traces;
    },
  };
}
