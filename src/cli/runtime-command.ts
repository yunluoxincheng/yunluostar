import type { Command } from "commander";
import { loadConfig } from "../config.js";

function cliOverridesFromRootOptions(opts: Record<string, unknown>): Record<string, unknown> {
  const overrides: Record<string, unknown> = {};
  if (opts.provider) overrides.provider = opts.provider;
  if (opts.baseUrl) overrides.baseUrl = opts.baseUrl;
  if (opts.model) overrides.model = opts.model;
  if (opts.temperature) overrides.temperature = Number(opts.temperature);
  if (opts.timeout) overrides.timeout = Number(opts.timeout);
  if (opts.session) overrides.defaultSessionId = opts.session;
  if (opts.db) overrides.databasePath = opts.db;
  if (opts.runtimeMode) overrides.runtimeMode = opts.runtimeMode;
  if (opts.runtimeUrl) overrides.runtimeUrl = opts.runtimeUrl;
  return overrides;
}

export function registerRuntimeCommand(program: Command): void {
  const runtime = program
    .command("runtime")
    .description("manage the yunluostar runtime service");

  runtime
    .command("serve")
    .description("start a local runtime HTTP/SSE service")
    .option("--host <host>", "Host to bind", "127.0.0.1")
    .option("--port <port>", "Port to bind", "3927")
    .action(async (opts: { host: string; port: string }) => {
      const config = loadConfig({
        ...cliOverridesFromRootOptions(program.opts()),
        runtimeMode: "local",
      });
      const { createLocalRuntimeServer } = await import("../runtime-client/local-server-adapter.js");
      const server = createLocalRuntimeServer(config);
      const port = Number(opts.port);
      await new Promise<void>((resolve) => server.listen(port, opts.host, resolve));
      console.log(`yunluostar runtime listening on http://${opts.host}:${port}`);
    });
}
