## ADDED Requirements

### Requirement: Runtime-backed CLI boundary
The system SHALL separate CLI-owned user interaction concerns from runtime-owned cognition, provider access, memory, storage, reflection, goals, and audit logging.

#### Scenario: CLI uses runtime client for chat
- **WHEN** the user sends chat input through the CLI
- **THEN** the CLI sends the request through the runtime-client boundary instead of directly invoking the agent controller

#### Scenario: CLI does not import provider internals
- **WHEN** CLI source files are checked by the boundary test
- **THEN** they do not import runtime-only provider, database, memory, or agent implementation modules directly

#### Scenario: Runtime owns provider access
- **WHEN** the runtime handles a chat request
- **THEN** LLM and embedding clients are created from runtime-owned configuration

### Requirement: Runtime protocol
The system SHALL define Zod-validated protocol schemas for runtime requests, responses, and streaming events.

#### Scenario: Chat streams runtime events
- **WHEN** the CLI submits a chat request to `POST /v1/chat`
- **THEN** the runtime streams validated SSE events for pipeline stage, tokens, tool requests, final result, or errors

#### Scenario: Runtime status is queryable
- **WHEN** the CLI requests runtime status
- **THEN** the runtime returns mode, version, provider readiness, embedding readiness, auth requirement, and storage ownership metadata

### Requirement: Runtime modes
The system SHALL support embedded, local, and hosted runtime modes.

#### Scenario: Embedded mode keeps local development usable
- **WHEN** runtime mode is `embedded`
- **THEN** the runtime-client invokes the local runtime adapter in-process

#### Scenario: Local mode uses HTTP
- **WHEN** runtime mode is `local`
- **THEN** the runtime-client sends requests to the configured local runtime URL

#### Scenario: Hosted mode uses runtime auth token
- **WHEN** runtime mode is `hosted`
- **THEN** the runtime-client sends the stored runtime auth token without requiring provider API keys in CLI config

### Requirement: Runtime authentication and redaction
The system SHALL store only runtime auth tokens in the CLI and redact secret-like values from displayed or logged config.

#### Scenario: Token storage uses user config directory
- **WHEN** the user logs in through the CLI
- **THEN** the runtime auth token can be saved to `~/.yunluo/auth.json`

#### Scenario: Invalid runtime token is rejected
- **WHEN** runtime auth is required and the CLI sends an invalid token
- **THEN** the runtime returns an unauthorized response

#### Scenario: Secrets are redacted
- **WHEN** config containing API keys, auth tokens, Authorization headers, or provider secret fields is displayed
- **THEN** the secret values are replaced by redacted placeholders

### Requirement: Runtime-owned storage and embedding
The runtime SHALL own relational storage, vector storage, memory writes/search, and embedding provider calls.

#### Scenario: SQLite is runtime-owned
- **WHEN** runtime status is requested
- **THEN** storage metadata indicates SQLite is owned by runtime

#### Scenario: Vector storage is behind runtime adapter
- **WHEN** the runtime creates vector search storage
- **THEN** it creates the store through a runtime vector-store adapter and passes only the abstract embedding store to the agent controller

#### Scenario: Memory APIs are scoped
- **WHEN** memory is listed through runtime APIs
- **THEN** results are constrained by runtime user and workspace scope

### Requirement: Local tool bridge
The runtime SHALL request local operations through protocol events and the CLI SHALL enforce local permission policy before executing them.

#### Scenario: Runtime emits tool request
- **WHEN** runtime planning requires a local file, shell, git, patch, or edit operation
- **THEN** the runtime emits a `tool_request` event instead of performing the operation directly

#### Scenario: Risky tools require approval by default
- **WHEN** a write, shell, patch, or edit request is evaluated under the default permission policy
- **THEN** the CLI requires explicit approval before executing it

#### Scenario: Tool denial is reported
- **WHEN** the user denies a tool request
- **THEN** the CLI posts a structured denied result back to the runtime

#### Scenario: Tool result is persisted
- **WHEN** the CLI posts a tool result
- **THEN** the runtime persists the result in scoped audit and memory records

### Requirement: Workspace context and isolation
The runtime-backed chat flow SHALL include permitted workspace context and isolate runtime-owned data by user, workspace, and session as appropriate.

#### Scenario: Instruction files are included
- **WHEN** a configured instruction file such as `AGENTS.md` or `CLAUDE.md` exists within the workspace
- **THEN** the runtime-client includes it in the chat request workspace context within configured size and path limits

#### Scenario: Workspaces are isolated
- **WHEN** two chat requests use the same session id from different workspace ids
- **THEN** their working memory state does not leak across workspaces

#### Scenario: Authenticated users are isolated
- **WHEN** two authenticated runtime users access memory with the same workspace id
- **THEN** each user sees only records scoped to that user

### Requirement: Packaging readiness
The runtime boundary SHALL keep future binary-backed CLI packaging possible without changing the protocol surface.

#### Scenario: CLI executable aliases exist
- **WHEN** the package is installed
- **THEN** both `yunluo` and `yunluostar` executable aliases are available

#### Scenario: Future binary runtime can replace local internals
- **WHEN** the project later ships a platform runtime binary
- **THEN** the CLI can continue using the same runtime-client protocol surface
