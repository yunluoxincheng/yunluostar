import { describe, it, expect } from "vitest";
import { pluginManifestSchema } from "../../src/plugins/manifest.js";
import { createPluginInterface } from "../../src/plugins/hooks.js";
import { createPluginRegistry } from "../../src/plugins/registry.js";
import type { PluginHookContext } from "../../src/plugins/hooks.js";

const TEST_CONTEXT: PluginHookContext = {
  request: {
    platformId: "webhook",
    adapterId: "generic-http",
    conversationId: "test-conv",
    senderUserId: "test-user",
    text: "hello",
  },
};

describe("Plugin Manifest: validation", () => {
  it("accepts a valid manifest", () => {
    const manifest = { id: "test-plugin", name: "Test Plugin", version: "1.0.0" };
    expect(pluginManifestSchema.parse(manifest)).toEqual({
      ...manifest,
      description: "",
      capabilities: [],
    });
  });

  it("accepts manifest with all fields", () => {
    const manifest = {
      id: "test-plugin",
      name: "Test Plugin",
      version: "1.0.0",
      description: "A test plugin",
      capabilities: ["memory.read"],
    };
    expect(pluginManifestSchema.parse(manifest)).toEqual(manifest);
  });

  it("rejects manifest with missing id", () => {
    expect(() => pluginManifestSchema.parse({ name: "Test", version: "1.0.0" })).toThrow();
  });

  it("rejects manifest with missing name", () => {
    expect(() => pluginManifestSchema.parse({ id: "test", version: "1.0.0" })).toThrow();
  });

  it("rejects manifest with missing version", () => {
    expect(() => pluginManifestSchema.parse({ id: "test", name: "Test" })).toThrow();
  });
});

describe("Plugin Registry: registration", () => {
  it("registers a valid plugin", () => {
    const registry = createPluginRegistry();
    const plugin = createPluginInterface({
      id: "test-plugin",
      name: "Test Plugin",
      version: "1.0.0",
    });
    registry.register(plugin);
    expect(registry.getPlugins()).toHaveLength(1);
    expect(registry.getPlugins()[0].id).toBe("test-plugin");
  });

  it("rejects duplicate plugin registration", () => {
    const registry = createPluginRegistry();
    const plugin = createPluginInterface({
      id: "test-plugin",
      name: "Test Plugin",
      version: "1.0.0",
    });
    registry.register(plugin);
    expect(() => registry.register(plugin)).toThrow(/already registered/);
  });

  it("returns empty list when no plugins registered", () => {
    const registry = createPluginRegistry();
    expect(registry.getPlugins()).toEqual([]);
  });
});

describe("Plugin Registry: hook execution", () => {
  it("runs message.received hook and returns trace", async () => {
    const registry = createPluginRegistry();
    const plugin = createPluginInterface(
      { id: "hook-plugin", name: "Hook Plugin", version: "1.0.0" },
      {
        "message.received": async (ctx) => {
          return { output: { processed: true, text: ctx.request.text } };
        },
      },
    );
    registry.register(plugin);

    const traces = await registry.runHook("message.received", TEST_CONTEXT);
    expect(traces).toHaveLength(1);
    expect(traces[0].pluginId).toBe("hook-plugin");
    expect(traces[0].hook).toBe("message.received");
    expect(traces[0].durationMs).toBeGreaterThanOrEqual(0);
    expect(traces[0].output).toEqual({ processed: true, text: "hello" });
  });

  it("runs message.responding hook", async () => {
    const registry = createPluginRegistry();
    const plugin = createPluginInterface(
      { id: "resp-plugin", name: "Response Plugin", version: "1.0.0" },
      {
        "message.responding": async (ctx) => {
          return { output: { enhanced: true } };
        },
      },
    );
    registry.register(plugin);

    const traces = await registry.runHook("message.responding", TEST_CONTEXT);
    expect(traces).toHaveLength(1);
    expect(traces[0].pluginId).toBe("resp-plugin");
  });

  it("skips plugins without the requested hook", async () => {
    const registry = createPluginRegistry();
    const plugin = createPluginInterface(
      { id: "no-hook-plugin", name: "No Hook Plugin", version: "1.0.0" },
      {},
    );
    registry.register(plugin);

    const traces = await registry.runHook("message.received", TEST_CONTEXT);
    expect(traces).toHaveLength(0);
  });

  it("isolates plugin hook errors and continues", async () => {
    const registry = createPluginRegistry();
    const badPlugin = createPluginInterface(
      { id: "bad-plugin", name: "Bad Plugin", version: "1.0.0" },
      {
        "message.received": async () => {
          throw new Error("Plugin error");
        },
      },
    );
    const goodPlugin = createPluginInterface(
      { id: "good-plugin", name: "Good Plugin", version: "1.0.0" },
      {
        "message.received": async () => {
          return { output: { ok: true } };
        },
      },
    );
    registry.register(badPlugin);
    registry.register(goodPlugin);

    const traces = await registry.runHook("message.received", TEST_CONTEXT);
    expect(traces).toHaveLength(2);
    expect(traces[0].output).toEqual({ error: "Plugin error" });
    expect(traces[1].output).toEqual({ ok: true });
  });

  it("runs multiple hooks on the same plugin", async () => {
    const registry = createPluginRegistry();
    const plugin = createPluginInterface(
      { id: "multi-plugin", name: "Multi Plugin", version: "1.0.0" },
      {
        "message.received": async () => ({ output: "received" }),
        "message.responding": async () => ({ output: "responding" }),
      },
    );
    registry.register(plugin);

    const recvTraces = await registry.runHook("message.received", TEST_CONTEXT);
    const respTraces = await registry.runHook("message.responding", TEST_CONTEXT);
    expect(recvTraces).toHaveLength(1);
    expect(respTraces).toHaveLength(1);
  });
});

describe("Plugin Interface: command handlers", () => {
  it("creates plugin with commands", () => {
    const plugin = createPluginInterface(
      { id: "cmd-plugin", name: "Command Plugin", version: "1.0.0" },
      {},
      {
        greet: async (args) => `Hello, ${args.join(" ")}!`,
      },
    );
    expect(plugin.commands).toBeDefined();
    expect(Object.keys(plugin.commands!)).toContain("greet");
  });

  it("executes command handler", async () => {
    const plugin = createPluginInterface(
      { id: "cmd-plugin", name: "Command Plugin", version: "1.0.0" },
      {},
      {
        echo: async (args) => args.join(" "),
      },
    );
    const result = await plugin.commands!.echo(["hello", "world"], TEST_CONTEXT);
    expect(result).toBe("hello world");
  });
});
