# yunluostar Bot Runtime Architecture

This document describes the Bot Runtime architecture for yunluostar — a multi-platform cognitive Agentic Bot platform.

## Product Direction

yunluostar is evolving from a CLI-first agent into a multi-platform Agentic Bot platform. The runtime is now the **Bot Runtime** — the product core — while the CLI is an admin/debug/developer tool. See `docs/goals/archive/pivot-to-cognitive-bot-platform.md` for the full product direction.

## Boundary

- `src/runtime/` is the Bot Runtime. It owns the agent controller, SQLite database access, LLM provider access, embedding client access, memory writes/search, goals, working memory, reflection, plugin execution, and runtime HTTP routes.
- `src/runtime-client/` is the only path the CLI uses to communicate with the runtime.
- `src/protocol/` owns Zod-validated HTTP/SSE payloads shared by runtime and client.
- `src/cli/` is an admin/debug/developer surface. It owns Commander commands, Ink TUI, slash commands, local auth token UX, config display, workspace context collection, and permission prompts. CLI code must not import provider or agent modules directly.
- `src/bot/` (planned) will own platform-neutral Bot message types, scope mapping, adapter interfaces, and conversation orchestration.
- `src/adapters/` (planned) will own Bot adapter implementations (HTTP webhook, future IM adapters).
- `src/plugins/` (planned) will own plugin manifest, registry, lifecycle, hooks, and command handling.

`tests/unit/cli-boundary.test.ts` prevents direct CLI imports from `src/llm/` and `src/agent/`.

### CLI Is Not the Primary Product Surface

- CLI is retained for admin commands, local debugging, runtime status inspection, memory/self/goal/reflection inspection, and future independent coding-agent experiments.
- CLI chat runs in **ephemeral mode**: no episode recording, no reflection, no consolidation, no working memory save, no goal creation. It only performs LLM generation and returns the response.
- If a future CLI coding agent needs long-term memory, that memory must be a separately designed system, not accidental reuse of Bot conversation memory.

## Runtime Modes

`runtimeMode` is configured in `~/.yunluo/config.json`, project `.yunluo/config.json`, environment variables, or CLI flags:

- `embedded`: compatibility mode. The runtime-client invokes the local runtime adapter in-process.
- `local`: the CLI connects to a local HTTP/SSE runtime service.
- `hosted`: the CLI connects to a remote runtime service.

`runtimeUrl` defaults to `http://127.0.0.1:3927`.

Start a local runtime service:

```bash
yunluo runtime serve --host 127.0.0.1 --port 3927
```

Point the CLI at it:

```bash
yunluo --runtime-mode local --runtime-url http://127.0.0.1:3927
```

## Runtime API

Current API surface:

- `POST /v1/auth/login`
- `POST /v1/chat` (CLI/runtime compatible, SSE streaming)
- `GET /v1/session/:id`
- `GET /v1/memory`
- `GET /v1/memory/:id`
- `GET /v1/goals`
- `POST /v1/goals/transition`
- `GET /v1/self`
- `GET /v1/reflections`
- `POST /v1/tools/result`
- `GET /v1/runtime/status`

Bot API surface (implemented):

- `POST /v1/bot/message` — submit a Bot message, receive response
- `POST /v1/bot/message/stream` — submit a Bot message with SSE streaming
- Bot requests carry `platformId`, `adapterId`, `conversationId`, `senderUserId`, `sessionId`, `text`, and `metadata`

Chat uses SSE events validated by `src/protocol/runtime.ts`:

- `stage`
- `token`
- `tool_request`
- `final`
- `error`

## Secret Ownership

Hosted mode must not require users to configure provider API keys locally. The CLI may store:

- runtime URL
- runtime mode
- local permission policy
- runtime auth token in `~/.yunluo/auth.json`

Provider API keys and embedding provider keys belong to the runtime. In local/self-hosted BYOK mode, the runtime may read provider credentials from explicit local runtime configuration or environment variables. The CLI does not need an embedding key and does not call embedding providers directly.

Logs and config display must redact API keys, tokens, Authorization headers, provider secret config, and other secret-like values. `src/security/redaction.ts` centralizes this behavior.

## Storage Ownership

SQLite is runtime-owned in the runtime-backed path. Runtime status reports:

```json
{
  "storage": {
    "driver": "sqlite",
    "ownedByRuntime": true
  }
}
```

Runtime-owned records carry `user_id` and `workspace_id` scope columns with compatibility defaults for existing local databases:

- episodes
- semantic memories
- user model
- self model
- goals
- working memory snapshots
- reflections
- audit logs

Bot conversations use `bot:` prefixed userId and workspaceId derived from Bot scope (platformId, adapterId, conversationId, senderUserId). This isolates Bot data from CLI's default `local-user`/`default-workspace` scope.

The runtime derives `workspace_id` from chat workspace context and applies it to runtime read APIs. This prevents the same session id in two workspaces from sharing working memory state.

When runtime auth is enabled, the HTTP server maps bearer tokens to runtime `user_id` values through configured `authUsers`, an explicit `authToken`/`authUserId` pair, or `YUNLUO_RUNTIME_TOKEN` plus optional `YUNLUO_RUNTIME_USER_ID`. Invalid or missing tokens receive `401`. The local embedded path keeps `local-user` as the default user id.

`src/runtime/storage.ts` is the runtime storage abstraction boundary. Future PostgreSQL or hosted storage adapters should implement the same runtime-side interface.

`src/runtime/vector-store.ts` is the runtime vector storage boundary. Future Qdrant or hosted vector backends should be added behind this runtime adapter layer.

## Permission Model

Local tool requests are represented in the protocol and evaluated by CLI-side policy before execution. Default policy:

- `readFile`: ask
- `writeFile`: ask
- `search`: allow
- `shell`: ask
- `gitStatus`: allow
- `gitDiff`: allow
- `applyPatch`: ask
- `editFile`: ask

Destructive shell commands are never auto-allowed by default.

## Workspace Context

The runtime-client collects configured instruction files from the workspace and sends them in the chat request workspace context. Defaults:

- `AGENTS.md`
- `CLAUDE.md`

The collector rejects paths outside the workspace root and skips oversized instruction files.

## Packaging Readiness

The package exposes both executable aliases: `yunluo` and `yunluostar`.

The current implementation still ships TypeScript-compiled runtime code in the npm package. The boundary above is designed so a later package can become a thin JavaScript launcher plus platform runtime binary without changing the protocol surface.
