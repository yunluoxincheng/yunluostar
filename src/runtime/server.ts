import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import type { AppConfig } from "../config.js";
import {
  chatRequestSchema,
  loginRequestSchema,
  runtimeEventSchema,
  toolResultSchema,
  type RuntimeEvent,
} from "../protocol/runtime.js";
import { goalTransitionSchema } from "../models/schemas.js";
import { createLocalAgentRuntime, type AgentRuntime } from "./local-agent-runtime.js";

export interface RuntimeServerOptions {
  host?: string;
  port?: number;
  authToken?: string;
  authUserId?: string;
  authUsers?: Record<string, string>;
  runtime?: AgentRuntime;
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf-8");
  return raw.length > 0 ? JSON.parse(raw) : {};
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendSse(res: ServerResponse, event: RuntimeEvent): void {
  const parsed = runtimeEventSchema.parse(event);
  res.write(`event: ${parsed.type}\n`);
  res.write(`data: ${JSON.stringify(parsed)}\n\n`);
}

interface AuthContext {
  userId: string;
}

function authenticate(req: IncomingMessage, config: AppConfig, options: RuntimeServerOptions): AuthContext | null {
  if (!config.runtimeAuthRequired) return { userId: options.authUserId ?? "local-user" };
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length);
  if (options.authUsers?.[token]) return { userId: options.authUsers[token] };
  if (options.authToken && token === options.authToken) return { userId: options.authUserId ?? "authenticated-user" };
  const expected = process.env.YUNLUO_RUNTIME_TOKEN;
  if (expected && token === expected) return { userId: process.env.YUNLUO_RUNTIME_USER_ID ?? options.authUserId ?? "authenticated-user" };
  return null;
}

function routeUrl(req: IncomingMessage): URL {
  const host = req.headers.host ?? "127.0.0.1";
  return new URL(req.url ?? "/", `http://${host}`);
}

export function createRuntimeHttpServer(config: AppConfig, options: RuntimeServerOptions = {}) {
  const runtime = options.runtime ?? createLocalAgentRuntime({ ...config, runtimeMode: "local" });

  const server = createServer(async (req, res) => {
    try {
      const url = routeUrl(req);
      const path = url.pathname;

      if (path === "/v1/runtime/status" && req.method === "GET") {
        return sendJson(res, 200, await runtime.status());
      }

      if (path === "/v1/auth/login" && req.method === "POST") {
        const body = loginRequestSchema.parse(await readJson(req));
        if (body.token) {
          const valid = options.authUsers?.[body.token] || body.token === options.authToken || body.token === process.env.YUNLUO_RUNTIME_TOKEN;
          if (!config.runtimeAuthRequired || valid) {
            return sendJson(res, 200, { status: "ok", token: body.token, message: "Token accepted for this runtime." });
          }
          return sendJson(res, 401, { error: "invalid_runtime_token" });
        }
        return sendJson(res, 200, {
          status: "instructions",
          message: "Set YUNLUO_RUNTIME_TOKEN on the runtime and save it with /login <token> from the CLI.",
        });
      }

      const auth = authenticate(req, config, options);
      if (!auth) {
        return sendJson(res, 401, { error: "invalid_or_missing_runtime_token" });
      }

      if (path === "/v1/chat" && req.method === "POST") {
        const request = chatRequestSchema.parse(await readJson(req));
        const abortController = new AbortController();
        let completed = false;
        res.on("close", () => {
          if (!completed) abortController.abort();
        });
        res.writeHead(200, {
          "content-type": "text/event-stream; charset=utf-8",
          "cache-control": "no-cache",
          connection: "keep-alive",
        });
        try {
          await runtime.chat(request, {
            onEvent: (event) => sendSse(res, event),
            signal: abortController.signal,
          }, auth.userId);
        } catch {
          // Runtime emits a protocol error event before rejecting. Keep the
          // response as SSE and close it instead of attempting a JSON error.
        } finally {
          completed = true;
        }
        return res.end();
      }

      if (path.startsWith("/v1/session/") && req.method === "GET") {
        const sessionId = decodeURIComponent(path.slice("/v1/session/".length));
        return sendJson(res, 200, await runtime.getSession(sessionId, url.searchParams.get("workspaceId") ?? undefined, auth.userId));
      }

      if (path === "/v1/memory" && req.method === "GET") {
        const limit = Number(url.searchParams.get("limit") ?? "20");
        return sendJson(res, 200, await runtime.listMemory(
          Number.isFinite(limit) ? limit : 20,
          url.searchParams.get("workspaceId") ?? undefined,
          auth.userId,
        ));
      }

      if (path.startsWith("/v1/memory/") && req.method === "GET") {
        const id = decodeURIComponent(path.slice("/v1/memory/".length));
        const item = await runtime.getMemory(id, url.searchParams.get("workspaceId") ?? undefined, auth.userId);
        return item ? sendJson(res, 200, item) : sendJson(res, 404, { error: "memory_not_found" });
      }

      if (path === "/v1/goals" && req.method === "GET") {
        return sendJson(res, 200, await runtime.listGoals({
          status: url.searchParams.get("status") ?? undefined,
          type: url.searchParams.get("type") ?? undefined,
          workspaceId: url.searchParams.get("workspaceId") ?? undefined,
          userId: auth.userId,
        }));
      }

      if (path === "/v1/goals/transition" && req.method === "POST") {
        const body = goalTransitionSchema.parse(await readJson(req));
        return sendJson(res, 200, await runtime.transitionGoal(body, url.searchParams.get("workspaceId") ?? undefined, auth.userId));
      }

      if (path === "/v1/self" && req.method === "GET") {
        return sendJson(res, 200, await runtime.listSelfModel(url.searchParams.get("workspaceId") ?? undefined, auth.userId));
      }

      if (path === "/v1/reflections" && req.method === "GET") {
        const limit = Number(url.searchParams.get("limit") ?? "20");
        return sendJson(res, 200, await runtime.listReflections(
          Number.isFinite(limit) ? limit : 20,
          url.searchParams.get("workspaceId") ?? undefined,
          auth.userId,
        ));
      }

      if (path === "/v1/tools/result" && req.method === "POST") {
        const body = toolResultSchema.parse(await readJson(req));
        await runtime.receiveToolResult(body, url.searchParams.get("workspaceId") ?? undefined, auth.userId);
        return sendJson(res, 202, { ok: true, requestId: body.requestId, toolRequestId: body.toolRequestId });
      }

      return sendJson(res, 404, { error: "not_found" });
    } catch (error) {
      return sendJson(res, 400, { error: (error as Error).message });
    }
  });

  return server;
}

export async function startRuntimeServer(config: AppConfig, options: RuntimeServerOptions = {}): Promise<{
  url: string;
  close: () => Promise<void>;
}> {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 3927;
  const server = createRuntimeHttpServer(config, options);
  await new Promise<void>((resolve) => server.listen(port, host, resolve));
  const address = server.address() as AddressInfo;
  return {
    url: `http://${host}:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve())),
  };
}
