## 1. Architecture Boundary

- [x] 1.1 Define CLI, runtime-client, protocol, runtime, provider, and storage boundaries.
- [x] 1.2 Add prohibited import tests for CLI code.
- [x] 1.3 Document the boundary and future packaging shape.

## 2. Protocol and Runtime Client

- [x] 2.1 Add typed protocol schemas for chat, runtime status, auth, tools, and list responses.
- [x] 2.2 Add runtime-client support for embedded, local, and hosted modes.
- [x] 2.3 Route CLI chat and read-only inspection commands through runtime-client.
- [x] 2.4 Add protocol and integration tests.

## 3. Runtime Service

- [x] 3.1 Add a local runtime service entrypoint.
- [x] 3.2 Add runtime status, auth login, chat, session, memory, goals, self, reflections, and tool-result endpoints.
- [x] 3.3 Stream chat output through SSE events.
- [x] 3.4 Wrap the existing agent controller behind the runtime adapter.

## 4. Auth, Config, and Redaction

- [x] 4.1 Add runtime mode, runtime URL, auth-required, permission policy, and context-file config.
- [x] 4.2 Add runtime token storage at `~/.yunluo/auth.json`.
- [x] 4.3 Add `/login`, `/logout`, `/status`, `/runtime`, and `/permissions` interactive commands.
- [x] 4.4 Add redaction utilities and tests.
- [x] 4.5 Ensure hosted mode does not require local provider keys.

## 5. Runtime-Owned Storage and Embedding

- [x] 5.1 Keep SQLite access behind runtime-owned storage.
- [x] 5.2 Keep embedding provider calls behind runtime-owned configuration.
- [x] 5.3 Add a vector-store adapter boundary for `sqlite-vec`.
- [x] 5.4 Add storage/vector boundary tests.
- [x] 5.5 Document future PostgreSQL and vector database adapter paths.

## 6. Tool Bridge and Permissions

- [x] 6.1 Add tool request and tool result protocol messages.
- [x] 6.2 Implement CLI-side read, write, edit, search, shell, git status, git diff, and patch tools.
- [x] 6.3 Add allow/ask/deny permission policy handling.
- [x] 6.4 Add TUI approval and denial commands.
- [x] 6.5 Persist tool results into runtime audit and memory records.
- [x] 6.6 Add unit and integration tests for tool policy and result flow.

## 7. Workspace and Scope

- [x] 7.1 Collect configured workspace instruction files.
- [x] 7.2 Send workspace context with chat requests.
- [x] 7.3 Add user and workspace scope columns to runtime-owned tables.
- [x] 7.4 Scope session, memory, goals, self, reflections, and audit access.
- [x] 7.5 Add isolation tests for workspace and authenticated users.

## 8. Verification

- [x] 8.1 Run `npm run lint`.
- [x] 8.2 Run `npm run build`.
- [x] 8.3 Run `npm test`.
- [x] 8.4 Run `openspec validate separate-cli-from-agent-runtime --strict`.
- [x] 8.5 Perform local runtime/CLI smoke verification or document any gap.
