Goal: Evolve yunluostar into a CLI-distributed, runtime-backed agent platform. Do not stop until each phase’s acceptance criteria are met and the overall architecture boundary is enforced.

## 1. Project Background

- Project name: yunluostar
- Project type: CLI-first agent platform, evolving toward a Claude Code / Codex / Pi-like product shape.
- Current tech stack:
  - CLI: TypeScript + Node.js 20+ + Commander + Ink TUI
  - Agent runtime: currently local TypeScript modules
  - Database: SQLite / Drizzle, with future runtime-side storage abstraction
  - LLM: OpenAI-compatible providers, GLM-5.1 user-configurable
  - Embedding: must become runtime-managed and provider-agnostic
  - Validation: Zod
  - Testing: Vitest
  - Spec workflow: OpenSpec
- Existing capabilities:
  - Interactive CLI/TUI shell
  - Memory system
  - Working memory
  - Self model
  - Goal system
  - Reflection/metacognition
  - Slash commands
  - OpenSpec-based change workflow

The long-term product shape is:

- Users install `yunluostar` CLI via npm.
- The CLI acts as a local UI, local execution bridge, workspace context collector, and runtime client.
- The agent runtime can run remotely, locally, or self-hosted.
- Runtime owns agent cognition, memory, goals, reflection, embedding, model routing, provider access, audit logs, and multi-user isolation.
- Future distribution may package the CLI as a thin JavaScript launcher plus platform binary, so `node_modules` does not expose the full implementation.

## 2. Objective

Implement a phased architecture evolution so that yunluostar supports:

1. A runtime-backed agent architecture.
2. A CLI that does not directly own provider secrets or embedding provider access.
3. Multi-provider authentication similar in spirit to Pi/opencode auth flows.
4. BYOK mode for user-configured LLM providers.
5. Runtime-managed embedding and memory.
6. HTTP + SSE streaming protocol between CLI and runtime.
7. A local tool bridge where runtime can request file, shell, git, patch, and edit operations through the CLI with permission controls.
8. Future packaging as a binary-backed CLI without exposing core implementation in `node_modules`.

## 3. Scope

Included:

1. Define and enforce CLI/runtime/client boundaries.
2. Introduce a `runtime-client` layer used by the CLI.
3. Introduce an agent runtime service layer.
4. Move LLM, embedding, memory, self model, goal system, reflection, planner, and controller ownership to runtime boundaries.
5. Keep Ink TUI as the official CLI interaction surface.
6. Add auth/config model:
   - `~/.yunluo/auth.json` for login tokens.
   - `config.json` for user-controlled provider configuration and permission policy.
7. Support both:
   - Hosted runtime mode.
   - Local/self-hosted runtime mode.
8. Add HTTP + SSE protocol for chat streaming and runtime events.
9. Add local tool bridge capabilities:
   - read file
   - write file
   - search
   - shell command
   - git diff/status
   - patch apply
   - edit file
10. Add permission policy for local tool execution.
11. Make embedding provider-agnostic and runtime-managed.
12. Ensure SQLite belongs to runtime, not CLI.
13. Design storage so runtime can later switch to PostgreSQL/Qdrant.
14. Support project context files such as:

- `AGENTS.md`
- `CLAUDE.md`
- future skill files
- similar project instruction documents

1. Document clearly that CLI does not hold embedding provider keys.

Excluded from the first architecture phase:

1. Final binary packaging implementation.
2. Full billing system.
3. Full cloud production deployment.
4. Complete multi-tenant SaaS hardening.
5. Enterprise admin dashboard.
6. Full plugin marketplace.
7. Replacing every runtime internals module in one commit if doing so creates excessive risk.

## 4. Relevant Directories

Expected or allowed directories:

- CLI source: `src/cli/`
- Ink TUI: `src/cli/tui/`
- Runtime client: `src/runtime-client/`
- Runtime service: `src/runtime/`
- Runtime API handlers: `src/runtime/api/`
- Runtime protocol schemas: `src/protocol/`
- Auth/config: `src/auth/`, `src/config/`
- Agent modules: `src/agent/`
- Memory modules: `src/memory/`
- Goal modules: `src/goals/` or existing project equivalent
- Self/working model modules: `src/models/`
- LLM provider logic: runtime-only modules under `src/llm/`
- Embedding provider logic: runtime-only modules under `src/embedding/` or `src/llm/embedding/`
- Database schema/migrations/repositories: `src/db/`
- Tests: `tests/`
- Documentation: `README.md`, `docs/`, OpenSpec change directories

Do NOT modify:

- Unrelated historical docs unless needed for consistency.
- Unrelated tests just to force green results.
- Lockfiles except when dependencies are intentionally changed.
- User secrets, local `.env`, or real auth files.

## 5. Business Rules

1. The public CLI package name/product name is `yunluostar`.
2. The CLI must support both hosted runtime and local/self-hosted runtime.
3. Hosted runtime mode should allow users to log in and use the product without configuring GLM/OpenAI provider keys locally.
4. BYOK mode must remain available for advanced users and self-hosted/local runtime users.
5. Embedding provider keys must only exist in runtime/server-side configuration.
6. GLM-5.1 is user-configurable and defaults to empty/unconfigured.
7. CLI must not require users to expose provider API keys unless they explicitly choose BYOK/local runtime.
8. SQLite must belong to runtime, not CLI, in the target architecture.
9. Runtime must support multi-user, multi-workspace, and multi-session isolation.
10. Runtime owns:
    - LLM calls
    - Embedding calls
    - Memory search/write
    - Goal system
    - Reflection
    - Self model
    - Planner
    - Agent controller
    - Audit logs
11. CLI owns:
    - TUI
    - login UX
    - local config/auth token storage
    - workspace context collection
    - local tool execution bridge
    - user permission prompts
    - streaming display
12. Runtime may request local operations, but CLI must enforce local permission policy.
13. Dangerous local actions must require confirmation unless explicitly allowed by config.
14. Project instruction files such as `AGENTS.md`, `CLAUDE.md`, and skill files should be discoverable and sent as part of workspace context according to policy.
15. Logs must redact API keys, tokens, Authorization headers, and sensitive provider config.

## 6. Frontend Requirements

There is no browser frontend in this goal. The CLI/TUI is the primary frontend.

CLI/TUI requirements:

1. Keep Ink as the official TUI framework.
2. The CLI command remains `yunluostar` or an agreed executable alias exposed by the package.
3. Interactive mode must support:
   - chat input
   - slash command palette
   - streaming assistant output
   - runtime connection state
   - auth status
   - current workspace/session status
   - tool approval prompts
   - readable error messages
4. Add or preserve UX for:
   - `/login`
   - `/logout`
   - `/config`
   - `/status`
   - `/runtime`
   - `/permissions`
   - existing commands such as memory/self/goals/reflections/working memory views, adapted through runtime where appropriate
5. When runtime is unavailable:
   - show clear connection error
   - do not crash
   - suggest local runtime or config action
6. When auth is missing:
   - show login guidance
   - allow BYOK/local runtime path where configured
7. Tool approval UI:
   - show requested operation
   - show path/command/patch summary
   - allow approve/deny
   - respect config policy for auto-allow/deny
8. Responsive terminal layout:
   - support narrow terminals gracefully
   - avoid overlapping text
   - preserve current TUI quality bar

## 7. Backend Requirements

Runtime service requirements:

1. Introduce a runtime API service that can run locally or remotely.
2. Allowed framework:
   - Hono or Fastify preferred.
   - Avoid heavy framework adoption unless justified.
3. Protocol:
   - HTTP/JSON for ordinary requests.
   - SSE for streaming chat responses and runtime events.
4. Required API surfaces, names may follow project conventions:
   1. `POST /v1/auth/login`
      - Purpose: start or complete login flow.
      - Response: auth token or login instructions.
      - Storage: CLI saves token to `~/.yunluo/auth.json`.

   2. `POST /v1/chat`
      - Purpose: submit user input and workspace context.
      - Request includes:
        - session id
        - workspace id/path metadata
        - user input
        - selected context files/summaries
        - client capabilities
      - Response:
        - SSE stream of assistant tokens/events
        - trace events
        - tool request events
        - final message

   3. `GET /v1/session/:id`
      - Purpose: fetch session state.

   4. `GET /v1/memory`
      - Purpose: query memory through runtime.

   5. `GET /v1/goals`
      - Purpose: query goals through runtime.

   6. `POST /v1/tools/result`
      - Purpose: CLI sends result of approved local tool execution back to runtime.

   7. `GET /v1/runtime/status`
      - Purpose: health, provider readiness, embedding readiness, auth status, version.

5. Runtime must include typed protocol schemas with Zod.
6. Runtime must support hosted and local modes.
7. Runtime must enforce user/workspace/session boundaries.
8. Runtime must own all direct provider access.
9. Runtime must not require CLI to send provider API keys in hosted mode.
10. Runtime must support BYOK only when explicitly configured.
11. Runtime must support project instruction ingestion:
    - AGENTS.md
    - CLAUDE.md
    - skill files
    - future instruction sources

## 8. Database Requirements

1. Target architecture:
   - SQLite belongs to runtime, not CLI.
   - CLI should not directly open or mutate the agent memory database.
2. Runtime database must store or continue to store:
   - episodes
   - semantic memories
   - self model
   - user model
   - goals
   - working memory snapshots
   - reflections
   - conflicts
   - audit logs
   - sessions
   - workspace metadata
   - user/runtime auth metadata where applicable
3. Add database/storage abstraction where needed so future runtime can switch to:
   - PostgreSQL for relational data
   - Qdrant or another vector DB for embeddings
4. Embedding storage must not couple permanently to SQLite.
5. Migrations must be safe for existing local development databases.
6. Tests must cover migration compatibility if schema changes are introduced.
7. Runtime data must be scoped by:
   - user id
   - workspace id
   - session id
     as appropriate.

## 9. Error Handling Requirements

1. Runtime unavailable:
   - CLI shows clear runtime connection error.
   - CLI does not lose current input if possible.
2. Missing auth:
   - CLI instructs user to run `/login` or configure local runtime.
3. Invalid token:
   - CLI prompts re-login.
4. Missing provider config in runtime:
   - runtime reports provider not configured.
   - CLI displays actionable message.
5. Missing embedding provider:
   - runtime reports embedding unavailable.
   - memory write/search should fail gracefully or degrade according to configured policy.
6. Tool denied:
   - runtime receives denial result.
   - conversation continues with denial context.
7. Tool execution failure:
   - CLI sends structured error to runtime.
   - no silent failure.
8. Permission policy conflict:
   - CLI chooses the safer option and asks for confirmation.
9. Invalid runtime response:
   - CLI reports protocol error with request id.
10. Logs must redact:
    - API keys
    - auth tokens
    - Authorization headers
    - provider secret config
    - sensitive local auth file contents

## 10. Permissions & Security

1. CLI must not hold embedding provider API keys.
2. CLI must not directly call embedding provider APIs in target architecture.
3. CLI may hold:
   - Yunluostar runtime auth token
   - runtime URL
   - user preference config
   - local permission policy
4. CLI auth token storage:
   - default path: `~/.yunluo/auth.json`
   - file should be created with user-only permissions where platform supports it.
5. User config:
   - default path: `~/.yunluo/config.json`
   - can contain runtime URL, BYOK/local runtime settings, permission policy.
6. Provider API keys:
   - hosted mode: only runtime/server environment owns provider keys.
   - local/self-hosted mode: runtime config may read provider keys from env/config according to explicit user setup.
7. Tool permissions:
   - read file may be configurable as allow/ask/deny.
   - write file must default to ask.
   - shell command must default to ask.
   - patch apply must default to ask.
   - git diff/status may default to allow.
   - destructive shell operations must never auto-allow by default.
8. Runtime must authenticate CLI requests.
9. Runtime must isolate users, workspaces, and sessions.
10. Runtime must validate all protocol payloads.
11. Never log complete secrets.
12. Never include real keys in docs, tests, fixtures, snapshots, or OpenSpec examples.

## 11. Engineering Constraints

1. Preserve existing code style.
2. Read relevant code before modifying.
3. Do not break the current Ink TUI without replacing it with equivalent or better behavior.
4. Do not hard-code provider API keys.
5. Do not put embedding provider keys in CLI code or CLI config as a normal hosted-mode path.
6. Do not let CLI import runtime-only provider modules.
7. Do not let CLI import database repositories directly once runtime boundary is introduced, except during transitional compatibility with explicit TODO and tests.
8. Avoid unnecessary dependencies.
9. If adding Hono/Fastify or another server dependency, explain why.
10. Keep changes phased and reviewable.
11. Maintain OpenSpec workflow for major changes.
12. Existing tests must continue to pass.
13. Add boundary tests to prevent CLI from importing provider secret modules.
14. Keep local development ergonomic.
15. Support Windows PowerShell development environment.
16. Do not rewrite unrelated files or reformat large areas unnecessarily.

## 12. Execution Flow

The implementation agent must work in phases.

### Phase 0: Architecture Audit and Proposal

1. Read README, AGENTS.md, OpenSpec docs, current CLI/TUI, agent controller, memory, goal, reflection, LLM, embedding/config modules.
2. Identify current direct dependencies from CLI to runtime internals.
3. Produce an OpenSpec change or architecture document for `separate-cli-from-agent-runtime`.
4. Define target module boundaries:
   - CLI
   - runtime-client
   - runtime
   - protocol
   - auth/config
   - provider modules
5. Define prohibited imports.
6. Validate the proposal before implementation.

### Phase 1: Protocol and Runtime Client

1. Add shared protocol schemas.
2. Add runtime-client abstraction.
3. CLI calls runtime-client instead of directly calling agent controller where feasible.
4. Support HTTP/JSON and SSE primitives.
5. Add tests for request/response schema validation.
6. Preserve local behavior through an adapter if needed.

### Phase 2: Runtime Service Shell

1. Add runtime service entrypoint.
2. Add health/status endpoint.
3. Add chat endpoint with SSE stream.
4. Wrap existing local controller behind runtime API.
5. Ensure existing chat flow can run through runtime locally.
6. Add CLI config for runtime URL and mode.
7. Add clear runtime connection errors.

### Phase 3: Auth and Config

1. Add `~/.yunluo/auth.json` handling.
2. Add `~/.yunluo/config.json` handling.
3. Add `/login`, `/logout`, `/config`, `/status`, `/runtime`.
4. Support hosted runtime token auth.
5. Support local runtime mode.
6. Add redaction utilities.
7. Add tests proving secrets are redacted.

### Phase 4: Runtime-Owned Embedding and Memory

1. Introduce provider-agnostic embedding interface in runtime.
2. Move embedding calls behind runtime-only module boundary.
3. Ensure CLI does not call embedding provider directly.
4. Ensure memory write/search happens through runtime.
5. Keep SQLite runtime-owned.
6. Add storage abstraction for future PostgreSQL/Qdrant.
7. Add tests for embedding config resolution, with fake provider by default.
8. Add docs stating embedding keys belong to runtime.

### Phase 5: Tool Bridge and Permissions

1. Define runtime tool request protocol.
2. Implement CLI-side local tool executor:
   - read file
   - write file
   - search
   - shell command
   - git diff/status
   - patch apply
   - edit file
3. Add permission policy config.
4. Add TUI approval prompts.
5. Default risky operations to ask.
6. Send structured tool results back to runtime.
7. Add tests for allow/ask/deny policy.

### Phase 6: Workspace Context and Instruction Files

1. Discover workspace instruction files:
   - AGENTS.md
   - CLAUDE.md
   - skill files
   - future configured instruction files
2. Send permitted context to runtime.
3. Support both full input and workspace context payloads.
4. Avoid sending excluded files.
5. Add config controls for context scope.
6. Add tests for discovery and filtering.

### Phase 7: Multi-User / Multi-Workspace / Multi-Session Boundaries

1. Add runtime data scoping where missing.
2. Ensure session, memory, goal, reflection, and audit data are scoped properly.
3. Add tests for cross-user/workspace/session isolation.
4. Update docs.

### Phase 8: Packaging Preparation

1. Do not implement full binary packaging yet unless explicitly requested.
2. Document future package shape:
   - npm package as thin launcher
   - optional platform binary packages
   - no core runtime code in public `node_modules`
3. Ensure current architecture allows CLI binary packaging later.
4. Add packaging design notes.

## 13. Acceptance Criteria

Must satisfy ALL phase-level criteria before claiming the full goal complete.

### Overall Acceptance

1. `yunluostar` CLI remains usable.
2. Ink TUI remains the primary interactive interface.
3. CLI can connect to a runtime service.
4. CLI can send chat input to runtime.
5. Runtime can stream assistant output back via SSE.
6. Runtime can call LLM provider through runtime-owned config.
7. Runtime can call embedding provider through runtime-owned config.
8. Runtime can write/search memory.
9. CLI does not directly own SQLite memory database in target path.
10. CLI does not hold embedding provider API key.
11. CLI can store runtime auth token in `~/.yunluo/auth.json`.
12. CLI can read user config from `~/.yunluo/config.json`.
13. BYOK/local runtime mode remains possible.
14. Hosted runtime mode does not require user provider keys.
15. Local tool requests require permission handling.
16. Permission policy can be configured.
17. Project instruction files can be discovered and sent as context.
18. Multi-user/workspace/session boundaries are designed and implemented where required.
19. Existing tests pass.
20. New boundary tests pass.
21. Lint passes.
22. Build/typecheck passes.
23. Documentation explicitly states:
    - CLI does not hold provider API keys in hosted mode.
    - Embedding keys belong to runtime.
    - User config can configure runtime and BYOK/local mode.
    - Runtime owns memory database and provider calls.

### First Milestone Acceptance

The first practical milestone is complete when:

1. A runtime service can start locally.
2. CLI can point to the local runtime.
3. CLI can send a chat request through runtime-client.
4. Runtime can stream back a response.
5. Existing 208+ tests still pass or are intentionally updated with clear justification.
6. A test prevents CLI from importing runtime-only provider secret modules.
7. Docs describe the CLI/runtime boundary.

## 14. Testing Requirements

1. Unit tests:
   - protocol schemas
   - runtime-client
   - config loading
   - auth file loading/saving
   - redaction
   - permission policy
   - embedding provider fake runtime
   - prohibited import boundary
2. Integration tests:
   - CLI runtime-client to local runtime
   - chat request with SSE stream
   - runtime status endpoint
   - memory write/search through runtime
   - tool request/response flow
3. Security tests:
   - redaction hides keys/tokens
   - CLI config does not require embedding key
   - runtime rejects invalid token
   - cross-session access is blocked where implemented
4. Manual smoke tests:
   - start local runtime
   - run `yunluostar`
   - login or configure runtime
   - send chat
   - approve/deny a tool request
   - inspect memory/goals/status through slash commands
5. Verification commands:
   - typecheck
   - lint
   - test
   - OpenSpec validate for related changes
6. If any automated test cannot be implemented in a phase, provide manual verification steps and explain why.

## 15. Prohibited Actions

- Do not place real API keys in source code.
- Do not place real API keys in tests, docs, fixtures, snapshots, or examples.
- Do not make CLI directly call embedding provider APIs in the target architecture.
- Do not make hosted-mode users configure provider keys as the default path.
- Do not let CLI directly own runtime SQLite data in the target path.
- Do not bypass runtime auth.
- Do not ignore multi-user/workspace/session boundaries.
- Do not silently execute write/shell/patch operations without permission policy.
- Do not auto-allow destructive shell commands by default.
- Do not break existing TUI behavior without equivalent replacement.
- Do not claim completion without running verification.
- Do not fabricate test results.
- Do not perform broad unrelated refactors.
- Do not introduce large dependencies without justification.
- Do not implement final binary packaging before the architecture boundary is stable unless explicitly requested.

## 16. Final Output

After each implementation phase, output:

1. Phase completed.
2. Modified files and what changed in each.
3. New APIs or protocol messages added.
4. Config/auth changes.
5. Database/storage changes.
6. Security boundary changes.
7. Tests added or updated.
8. Verification commands run and results.
9. Remaining risks.
10. Next recommended phase.

After the full goal is complete, output:

1. Final architecture summary.
2. CLI/runtime boundary summary.
3. Secret ownership summary.
4. Runtime API summary.
5. Tool permission model summary.
6. Embedding/memory ownership summary.
7. Packaging readiness summary.
8. Full verification results.
9. Remaining future work:
   - production hosted runtime hardening
   - billing/rate limiting
   - binary distribution
   - enterprise/self-host packaging
