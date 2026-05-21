## Why

Yunluostar is moving from a local CLI that directly owns agent internals into a runtime-backed agent platform. The CLI should act as the user interface, workspace context collector, auth-token holder, and local tool bridge, while the runtime owns cognition, memory, model access, embedding, reflection, goals, audit logs, and isolation boundaries.

This separation is needed so users can run the CLI against embedded, local, self-hosted, or hosted runtime modes without exposing provider credentials in hosted mode, and so future packaging can ship a thinner CLI launcher without changing the protocol surface.

## What Changes

- Add shared runtime protocol schemas for HTTP/JSON and SSE events.
- Add a `runtime-client` layer and route CLI chat, memory, self, goals, reflections, and status reads through it.
- Add a runtime service shell with local HTTP endpoints and SSE chat streaming.
- Add local auth token storage and runtime auth handling.
- Add config for runtime mode, runtime URL, auth requirements, permission policy, and context files.
- Move SQLite and vector-store setup behind runtime-owned adapters.
- Keep provider and embedding access runtime-owned.
- Add workspace context collection for instruction files.
- Add a local tool bridge with permission policy and TUI approval commands.
- Add user/workspace/session scoping for runtime-owned data.
- Add boundary, protocol, storage, auth, redaction, tool, and integration tests.

## Capabilities

### New Capabilities

- `runtime-backed-agent-platform`: The CLI can communicate with an agent runtime through typed protocols, while the runtime owns provider access, memory, storage, cognition, auth enforcement, and scoped data.

### Modified Capabilities

- `interactive-yunluo-cli`: The Ink TUI displays runtime connection/auth state and supports runtime-mediated tool approval flows.

## Impact

- Affects CLI handlers, TUI state, config loading, auth storage, runtime client, protocol schemas, runtime service, storage ownership, database schema, and tests.
- Adds runtime HTTP/SSE APIs without adding a heavy server framework dependency.
- Adds safe migration columns for user/workspace scoping.
- Keeps local embedded mode for development compatibility.
- Leaves production hosted hardening, billing, rate limits, and binary packaging as future work.
