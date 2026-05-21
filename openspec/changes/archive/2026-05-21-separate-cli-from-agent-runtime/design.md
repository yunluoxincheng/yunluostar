## Boundary Design

The target boundary has four main layers:

- `src/cli/`: Commander commands, Ink TUI, slash commands, local token UX, local config display, context collection triggers, and permission prompts.
- `src/runtime-client/`: the client boundary used by CLI code for runtime status, chat, memory, goals, self model, reflections, auth, and tool results.
- `src/protocol/`: Zod schemas for HTTP payloads and SSE runtime events.
- `src/runtime/`: runtime-owned service, local agent adapter, storage adapters, vector-store adapters, auth enforcement, tool-result persistence, and controller orchestration.

Runtime-only implementation modules include `src/llm/`, `src/memory/`, `src/db/`, `src/agent/`, `src/metacognition/`, and `src/planning/`. CLI code must not import them directly.

## Runtime Modes

- `embedded`: the CLI uses an in-process runtime adapter for development compatibility.
- `local`: the CLI connects to a local runtime service through HTTP/SSE.
- `hosted`: the CLI connects to a remote runtime service and authenticates with a runtime token.

## Protocol

Runtime APIs use HTTP/JSON for ordinary requests and SSE for streaming chat events. Chat streams `stage`, `token`, `tool_request`, `final`, and `error` events validated by shared Zod schemas.

## Auth and Secrets

The CLI may store runtime URL, runtime mode, permission policy, context-file preferences, and a runtime auth token. Hosted provider keys and embedding keys belong to the runtime. Redaction utilities hide tokens, authorization headers, API keys, and provider secret config in displayed config and logs.

## Storage

SQLite is runtime-owned and exposed through `src/runtime/storage.ts`. Vector storage is runtime-owned and exposed through `src/runtime/vector-store.ts`; the first adapter uses `sqlite-vec`, while future Qdrant or hosted vector stores should implement the same runtime boundary.

Runtime records carry user and workspace scope where required, and working memory is scoped by session plus runtime scope.

## Tool Bridge

Runtime tool requests are protocol events. The CLI evaluates requests through local permission policy, executes only approved local tools, and posts structured results back to runtime. Risky write, shell, patch, and edit operations default to confirmation.

## Packaging

The current package still ships compiled runtime code. The boundary is designed so a future package can replace local runtime internals with a platform binary or hosted runtime without changing CLI UX or protocol schemas.
