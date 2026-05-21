# yunluostar CLI / Runtime Boundary

This document records the current runtime-backed architecture milestone for `docs/goals/separate-cli-from-agent-runtime.md`.

## Boundary

- `src/cli/` owns Commander commands, the Ink TUI, slash command routing, local auth token UX, local config display, workspace context collection triggers, and permission prompts.
- `src/runtime-client/` is the only path the CLI uses for chat, runtime status, memory listing, and goal listing.
- `src/protocol/` owns Zod-validated HTTP/SSE payloads shared by runtime and client.
- `src/runtime/` owns the agent controller adapter, SQLite database access, LLM provider access, embedding client access, memory writes/search, goals, working memory, and runtime HTTP routes.
- `src/llm/`, `src/memory/`, `src/db/`, `src/agent/`, `src/metacognition/`, and `src/planning/` are runtime-side implementation modules. CLI code must not import provider or agent modules directly.

`tests/unit/cli-boundary.test.ts` prevents direct CLI imports from `src/llm/` and `src/agent/`.

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
- `POST /v1/chat`
- `GET /v1/session/:id`
- `GET /v1/memory`
- `GET /v1/memory/:id`
- `GET /v1/goals`
- `POST /v1/goals/transition`
- `GET /v1/self`
- `GET /v1/reflections`
- `POST /v1/tools/result`
- `GET /v1/runtime/status`

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

This keeps the CLI from owning memory storage in the target architecture and leaves room for future PostgreSQL and vector database backends.

Runtime-owned records now carry `user_id` and `workspace_id` scope columns with compatibility defaults for existing local databases:

- episodes
- semantic memories
- user model
- self model
- goals
- working memory snapshots
- reflections
- audit logs

The runtime derives `workspace_id` from chat workspace context and applies it to runtime read APIs. This prevents the same session id in two workspaces from sharing working memory state.

When runtime auth is enabled, the HTTP server maps bearer tokens to runtime `user_id` values through configured `authUsers`, an explicit `authToken`/`authUserId` pair, or `YUNLUO_RUNTIME_TOKEN` plus optional `YUNLUO_RUNTIME_USER_ID`. Invalid or missing tokens receive `401`. The local embedded path keeps `local-user` as the default user id.

`src/runtime/storage.ts` is the runtime storage abstraction boundary. The current adapter is SQLite and owns connection setup, migrations, and cleanup through `withDb(...)`. Future PostgreSQL or hosted storage adapters should implement the same runtime-side interface rather than being imported by CLI code.

`src/runtime/vector-store.ts` is the runtime vector storage boundary. The current adapter uses `sqlite-vec`, but the agent controller only receives the `EmbeddingStore` abstraction. Future Qdrant or hosted vector backends should be added behind this runtime adapter layer, keeping the CLI and agent controller out of SQLite-specific vector setup.

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

Destructive shell commands are never auto-allowed by default, even when shell policy is set to `allow`.

The CLI-side executor currently supports:

- `read_file`
- `write_file`
- `search`
- `shell`
- `git_status`
- `git_diff`
- `apply_patch`
- `edit_file`

`apply_patch` requests require approval by default and are applied through `git apply` with the patch supplied in the request payload. When a runtime sends a `tool_request` SSE event, the TUI evaluates policy, auto-executes `allow`, sends structured denial for `deny`, and displays an approval-required system entry for `ask`.

For the current milestone, the local runtime can emit a tool request from explicit chat input in this form:

```text
tool:read_file {"path":"README.md"}
```

The Ink TUI approval flow accepts:

```text
/approve <tool-id>
/deny <tool-id>
```

Tool results posted to `POST /v1/tools/result` are persisted into runtime audit logs under `local_tool_results`, scoped by runtime user and workspace.

## Workspace Context

The runtime-client collects configured instruction files from the workspace and sends them in the chat request workspace context. Defaults:

- `AGENTS.md`
- `CLAUDE.md`

The collector rejects paths outside the workspace root and skips oversized instruction files.

## Packaging Readiness

The package now exposes both executable aliases:

- `yunluo`
- `yunluostar`

The current implementation still ships TypeScript-compiled runtime code in the npm package. The boundary above is designed so a later package can become a thin JavaScript launcher plus platform runtime binary without changing the CLI protocol surface.
