Goal: Pivot yunluostar into a next-generation cognitive Agentic Bot platform inspired by AstrBot and openclaw. Do not stop until the platform direction, runtime boundary, MVP entry points, and cognitive core acceptance criteria are implemented and verified.

Supersedes product-direction assumptions in `docs/goals/archive/separate-cli-from-agent-runtime.md` where they frame yunluostar as a CLI-distributed Claude Code / Codex / Pi-like agent platform. The runtime boundary from that work remains useful, but the product surface and long-term memory ownership are now Bot-platform-first.

## 1. Project Background

- Project name: yunluostar
- Project type: multi-platform Agentic Bot platform with persistent cognitive state.
- Product direction:
  - yunluostar is not a Claude Code-like coding CLI.
  - yunluostar is not a pure local BYOK terminal agent.
  - yunluostar should become a next-generation Bot platform in the direction of AstrBot and openclaw, but with a stronger long-term cognitive core.
- Current tech stack:
  - Runtime: TypeScript + Node.js 20+
  - CLI: Commander + Ink TUI
  - Protocol validation: Zod
  - Database: SQLite + Drizzle ORM, with scoped persistence already introduced
  - Vector retrieval: sqlite-vec / embedding-backed retrieval, with lexical fallback allowed
  - LLM: OpenAI-compatible providers and deterministic local test client
  - Testing: Vitest
  - Spec workflow: OpenSpec
- Existing capabilities:
  - Interactive CLI/TUI shell
  - Runtime-backed chat path
  - Cognitive memory system: episodic memories, semantic memories, memory awakening, memory consolidation
  - Working memory
  - Self model
  - User model
  - Goal system
  - Reflection/metacognition records
  - Slash commands for inspection
  - Runtime protocol, runtime-client, HTTP runtime, embedded runtime adapter
  - Scoped storage concepts for user/workspace/session isolation
- Strategic correction:
  - The current CLI-first framing is too close to developer Agent tools such as Claude Code or Codex.
  - The runtime-backed architecture should be retained, but reframed as the Bot Runtime rather than a CLI support layer.
  - CLI should remain useful for administration, debugging, local development, and future coding-agent experiments, but it must not be the primary product surface for the long-term memory Bot platform.
  - CLI interactions must not write into the Bot platform's long-term cognitive memory by default. If CLI chat remains available, it must use an explicit debug/ephemeral mode or a separately scoped future coding-agent memory system.
  - The long-term memory, self model, user model, goal system, and reflection system are the product differentiators and must remain first-class.

## 2. Objective

Reposition and evolve yunluostar into a multi-platform Agentic Bot platform where users interact through chat surfaces such as WebChat, HTTP webhook adapters, and later IM platform adapters, while the Bot Runtime owns long-term memory, self model, user model, goals, reflection, model access, plugin execution, and scoped persistence.

The first milestone must prove the new product shape:

1. A non-CLI message entry point can send messages into the Bot Runtime.
2. The runtime can respond through a platform-neutral Bot message protocol.
3. Conversations are scoped by platform, conversation, user, and session.
4. Long-term memory and reflection update from Bot conversations.
5. CLI remains available only as an admin/debug surface and does not become the primary long-term memory interaction surface.

## 3. Scope

Included:

1. Reframe the project architecture around a Bot Runtime.
2. Preserve and adapt the existing runtime-backed architecture.
3. Introduce platform-neutral Bot message protocol types.
4. Add a minimal HTTP webhook adapter as the first non-CLI Bot entry point.
5. Add a minimal WebChat-compatible runtime API, even if no full browser UI is implemented in the first milestone.
6. Add Bot conversation scope:
   - platform id
   - adapter id
   - conversation id
   - sender user id
   - session id
7. Map Bot conversations into existing cognitive memory, self model, user model, goals, and reflection flows.
8. Introduce an initial plugin architecture:
   - plugin manifest
   - plugin lifecycle registration
   - message event hooks
   - command handlers
   - plugin config access
   - runtime-enforced safety boundary
9. Keep CLI and Ink TUI as admin/debug/developer surfaces.
10. Remove the product assumption that CLI is the main user experience.
11. Define a clean future path where CLI can later become a separate self-developed coding agent without carrying the Bot platform's long-term memory UX.
12. Ensure CLI chat, if retained, does not write into Bot long-term memory by default.
13. Update documentation and specs to reflect the new direction.
14. Add tests for Bot protocol, scope mapping, HTTP webhook adapter, WebChat API, plugin registration, and CLI memory isolation.

Excluded:

1. Full AstrBot compatibility.
2. Full openclaw compatibility.
3. Importing or copying AstrBot/openclaw architecture directly.
4. IM platform adapters for QQ, WeChat, Telegram, Slack, Discord, Feishu, DingTalk, or WeCom in the first milestone.
5. Plugin marketplace.
6. Public plugin distribution.
7. Full Web Dashboard implementation.
8. SaaS billing, quotas, subscription plans, and tenant billing.
9. Multi-node production deployment.
10. Docker/Kubernetes production packaging.
11. Independent coding-agent product implementation.
12. Removing the existing runtime/protocol/runtime-client directories as part of this pivot.
13. Removing cognitive core modules.
14. Rewriting the whole codebase before proving the Bot Runtime path.
15. Long-term memory writes from CLI chat as part of the Bot platform product surface.

## 4. Relevant Directories

- Project documentation:
  - `README.md`
  - `AGENTS.md`
  - `docs/`
  - `docs/goals/`
  - `docs/conscious_agent_plan/`
- OpenSpec:
  - `openspec/specs/`
  - `openspec/changes/`
- Runtime:
  - `src/runtime/`
  - `src/protocol/`
  - `src/runtime-client/`
- Agent and cognition:
  - `src/agent/`
  - `src/memory/`
  - `src/models/`
  - `src/planning/`
  - `src/metacognition/`
  - `src/db/`
- LLM:
  - `src/llm/`
  - `src/config.ts`
- CLI/admin/debug:
  - `src/cli/`
  - `src/cli/tui/`
- New Bot platform modules:
  - `src/bot/` for platform-neutral Bot message types, scope mapping, adapter interfaces, and conversation orchestration.
  - `src/adapters/http-webhook/` or `src/bot/adapters/http-webhook/` for the first HTTP webhook adapter.
  - `src/plugins/` for plugin manifest, registry, lifecycle, hooks, and command handling.
  - `src/webchat/` or runtime routes under `src/runtime/` for minimal WebChat-compatible APIs.
- Tests:
  - `tests/`
  - colocated `*.test.ts` if that is the existing project pattern.

Do NOT modify:

1. User secrets or real local config files.
2. Lockfiles unless a dependency change is intentionally required and explained first.
3. Unrelated archived OpenSpec changes unless documentation consistency explicitly requires it.
4. Historical research documents unless they are directly contradicted by the new product direction and the edit is minimal.
5. Runtime directories for deletion. The runtime is now the product core.

## 5. Business Rules

1. yunluostar is a multi-platform Agentic Bot platform with persistent cognitive state.
2. The primary interaction model is conversation through Bot adapters, not terminal-first task execution.
3. The product should learn from AstrBot and openclaw at the product-shape level, but implement its own architecture.
4. The differentiator is long-term cognitive continuity:
   - long-term memory
   - self model
   - user model
   - goal system
   - reflection/metacognition
5. Memory must affect future behavior, not merely appear as retrieved context.
6. Self model must be dynamic state, not a static persona prompt.
7. Persona configuration may exist, but it must not replace the self model.
8. Goals must remain governed by safety and user-control boundaries.
9. Every Bot conversation must be traceable by platform, conversation, user, and session scope.
10. Bot runtime owns model access, memory writes, reflection, goal updates, plugin execution, and audit logging.
11. CLI is retained for:
    - admin commands
    - local debugging
    - runtime status inspection
    - memory/self/goal/reflection inspection
    - future independent coding-agent experiments
12. CLI must not be treated as the main long-term memory user experience after this pivot.
13. CLI chat must not write to Bot long-term memory by default.
14. If a future CLI coding agent needs long-term memory, that memory must be a separately designed coding-agent memory system, not accidental reuse of Bot conversation memory.
15. The first milestone should prefer stable local HTTP/WebChat-style entry points over fragile third-party IM integrations.
16. Provider keys are runtime/admin configured in the MVP; per-user BYOK is deferred.
17. Conversation data must stay scoped and must not leak across platforms, conversations, users, or sessions.
18. Plugins must run through runtime-controlled APIs and must not bypass memory, permission, audit, or safety boundaries.

## 6. Frontend Requirements

The first milestone does not require a full browser dashboard, but it must define and support non-CLI interaction surfaces.

### WebChat-Compatible API

1. Provide a minimal runtime API that a future WebChat frontend can call.
2. The API must accept:
   - platform id
   - conversation id
   - sender user id
   - message text
   - optional session id
   - optional metadata
3. The API must return or stream:
   - assistant response text
   - trace id
   - episode id when created
   - reflection id when created
   - memory ids when relevant
   - active goal ids when relevant
4. The API should be compatible with a future browser chat UI, but the first milestone may verify it through HTTP tests.

### CLI/Admin Surface

1. Keep existing CLI and Ink TUI operational.
2. Update CLI copy/documentation so it is described as admin/debug/developer tooling.
3. CLI chat may remain for local smoke testing, but it must not define the product's primary architecture.
4. CLI chat must not write into Bot long-term memory by default.
5. CLI debug chat should use one of the following explicit modes:
   - ephemeral, no persistent memory writes
   - read-only inspection of Bot memory
   - a separately scoped future coding-agent memory store
6. CLI long-term memory UX must not expand as part of this pivot.
7. Future coding-agent work must be documented as a separate direction from the Bot platform.

### Dashboard

1. Full dashboard implementation is out of scope for the first milestone.
2. Runtime/admin APIs should be shaped so a future dashboard can manage:
   - adapters
   - provider status
   - plugins
   - persona config
   - memory inspection
   - goals
   - reflections
   - audit logs

## 7. Backend Requirements

### Bot Runtime

1. The runtime SHALL be reframed as the Bot Runtime.
2. Runtime SHALL own:
   - agent controller
   - LLM provider access
   - embedding provider access
   - memory
   - self model
   - user model
   - goals
   - reflection/metacognition
   - plugin execution
   - audit logging
   - scoped persistence
3. Runtime SHALL expose platform-neutral Bot message handling independent of CLI assumptions.

### Bot Protocol

Add platform-neutral protocol types for:

1. `BotMessageRequest`
   - `platformId: string`
   - `adapterId: string`
   - `conversationId: string`
   - `senderUserId: string`
   - `sessionId?: string`
   - `text: string`
   - `messageId?: string`
   - `timestamp?: string`
   - `metadata?: Record<string, unknown>`
2. `BotMessageResponse`
   - `responseText: string`
   - `traceId: string`
   - `sessionId: string`
   - `episodeId?: string`
   - `reflectionId?: string`
   - `memoryIds?: string[]`
   - `goalIds?: string[]`
   - `pluginEvents?: PluginEventTrace[]`
3. `BotScope`
   - `platformId`
   - `adapterId`
   - `conversationId`
   - `senderUserId`
   - `sessionId`
4. `BotStreamEvent`
   - stage events
   - token events
   - plugin events
   - final response
   - error events

All protocol types must be Zod-validated.

### HTTP Webhook Adapter

Add a minimal HTTP webhook adapter:

1. Accept incoming HTTP POST messages.
2. Normalize the payload into `BotMessageRequest`.
3. Call Bot Runtime message handling.
4. Return `BotMessageResponse`.
5. Validate input and return clear errors for invalid payloads.
6. Support at least one generic payload format:

```json
{
  "platformId": "webhook",
  "adapterId": "generic-http",
  "conversationId": "demo-conversation",
  "senderUserId": "demo-user",
  "text": "hello",
  "metadata": {}
}
```

### WebChat Runtime API

Add a minimal WebChat-compatible API:

1. `POST /v1/bot/message`
   - Purpose: submit a Bot message and receive a response.
   - Request: `BotMessageRequest`
   - Response: `BotMessageResponse`
2. Optional streaming endpoint if it fits the existing SSE pattern:
   - `POST /v1/bot/message/stream`
   - Response: validated Bot stream events
3. Existing `/v1/chat` may remain for CLI/runtime compatibility, but Bot APIs are the new product path.

### Plugin System MVP

Add an initial plugin architecture:

1. Plugin manifest:
   - plugin id
   - name
   - version
   - description
   - entry module
   - requested capabilities
   - config schema reference or inline schema
2. Plugin registry:
   - load built-in plugins
   - validate manifests
   - expose plugin metadata to runtime/admin APIs
3. Plugin hooks:
   - `message.received`
   - `message.responding`
   - `memory.created`
   - `goal.suggested`
   - `tool.requested`
4. Command handlers:
   - plugins may register slash-like or prefix commands for Bot conversations
   - command execution must run through runtime safety boundaries
5. Plugin config:
   - plugin config must be read through runtime APIs
   - secrets must be redacted when displayed
6. Plugin safety:
   - plugins must not directly access database internals unless a controlled interface is provided
   - plugins must not bypass runtime scope or audit logic

### Cognitive Core Integration

1. Bot messages must flow through the same cognitive pipeline as current chat:
   - input interpretation
   - memory awakening
   - context building
   - model response
   - episode recording
   - semantic extraction/consolidation
   - self/user model update
   - goal suggestion/update
   - reflection/metacognition
2. Bot scope must be included in memory, reflection, goal, and audit records where relevant.
3. Existing workspace scope must remain for CLI/debug compatibility, but Bot scope is the new product-level scope.

## 8. Database Requirements

1. Reuse existing SQLite/Drizzle infrastructure.
2. Do not replace the database in the first milestone.
3. Add schema changes only if required for Bot scope.
4. Preferred approach:
   - First adapt existing scoped fields if they can represent Bot conversations safely.
   - Add explicit Bot scope fields only when the existing schema cannot express platform/conversation/user isolation cleanly.
5. If schema changes are required, add migrations and tests.
6. Candidate new or extended fields:
   - `platform_id`
   - `adapter_id`
   - `conversation_id`
   - `sender_user_id`
   - `bot_session_id`
7. Any new fields must be indexed if used for common lookup or isolation.
8. Memory, reflection, goals, and audit records must be queryable by Bot scope.
9. No production data migration assumptions should be made without an explicit migration plan.

## 9. Error Handling Requirements

1. Invalid Bot request:
   - Return a validation error with field-level details.
2. Missing `platformId`, `conversationId`, `senderUserId`, or `text`:
   - Return a 400-style response.
3. Unknown adapter:
   - Return a clear adapter error.
4. Runtime unavailable:
   - Return a readable runtime error without crashing the server.
5. Provider unavailable:
   - Return a Bot-safe error response and record the failure in trace/audit logs.
6. Embedding unavailable:
   - Degrade to lexical or deterministic fallback where currently supported.
7. Plugin manifest invalid:
   - Reject the plugin and expose the validation error in admin/debug output.
8. Plugin execution failure:
   - Isolate the plugin failure.
   - Continue the core Bot response when safe.
   - Record the plugin error in trace/audit output.
9. Scope conflict:
   - Reject requests that would mix incompatible platform/conversation/user scopes.
10. Database write failure:
   - Surface a clear error and do not claim memory/reflection was saved.
11. Streaming failure:
   - Emit a validated error event if streaming has already started.

## 10. Permissions & Security Requirements

1. Runtime/admin provider configuration is the MVP default.
2. Per-user BYOK is out of scope for the first milestone.
3. Provider secrets must not be printed in CLI, logs, runtime status, plugin metadata, or API responses.
4. Reuse existing redaction utilities for secret-like values.
5. HTTP webhook endpoints must validate payload shape.
6. Public deployment security is not fully solved in the first milestone, but the design must not hard-code an open production posture.
7. Webhook authentication may be simple in MVP, but the API shape must allow later:
   - shared secrets
   - signed requests
   - adapter tokens
   - admin auth
8. Bot conversation state must be isolated by Bot scope.
9. Plugins must declare capabilities.
10. Runtime must enforce plugin capabilities before granting access to sensitive APIs.
11. Plugins must not receive raw provider secrets.
12. Plugins must not directly mutate memory, goals, self model, or user model except through approved runtime interfaces.
13. Tool execution must remain behind runtime/CLI permission policies where local tools are involved.
14. Audit logs must capture security-relevant state changes and plugin actions.

## 11. Engineering Constraints

1. Preserve existing code style.
2. Read relevant code before modifying.
3. Keep changes phased and reviewable.
4. Do not perform a broad rewrite before proving the Bot Runtime path.
5. Do not delete runtime/protocol/runtime-client as part of this pivot.
6. Do not weaken the cognitive core.
7. Do not introduce a large framework dependency unless it is necessary and justified first.
8. Prefer Zod schemas for protocol boundaries.
9. Reuse existing runtime server patterns where practical.
10. Reuse existing memory, reflection, goal, model, and audit repositories where practical.
11. Keep CLI working after each milestone.
12. Update tests with each behavior change.
13. Run typecheck and tests before claiming completion.
14. If lint scripts exist, run them before final output.
15. Do not fabricate verification results.
16. Avoid dependency upgrades unless required for this feature.
17. Keep Windows PowerShell compatibility in scripts and documentation.

## 12. Execution Flow

### Phase 0: Direction Lock

1. Update documentation to state the new product direction:
   - next-generation cognitive Agentic Bot platform
   - inspired by AstrBot/openclaw product shape
   - own architecture, not a clone
   - CLI is admin/debug, not primary product UX
2. Mark older Claude Code-like or pure local BYOK CLI goals as superseded in documentation.
3. Do not delete historical docs unless explicitly requested.
4. Run documentation-oriented checks where available.

### Phase 1: Bot Protocol and Scope

1. Add platform-neutral Bot protocol schemas.
2. Add Bot scope mapping.
3. Define how Bot scope maps to existing runtime user/workspace/session concepts.
4. Add unit tests for schema validation and scope derivation.
5. Ensure invalid Bot requests fail with useful errors.

### Phase 2: Runtime Bot Message Path

1. Add a Bot Runtime message handler.
2. Route Bot messages through the existing cognitive chat pipeline.
3. Ensure memory awakening, episode recording, reflection, self/user model updates, and goal logic still run.
4. Return Bot-specific trace metadata.
5. Add integration tests using deterministic LLM behavior.

### Phase 3: HTTP Webhook Adapter

1. Add generic HTTP webhook endpoint.
2. Normalize webhook payload into Bot protocol.
3. Call the Bot Runtime message handler.
4. Return response in a stable JSON shape.
5. Add HTTP tests for success and validation failure.

### Phase 4: WebChat-Compatible API

1. Add `POST /v1/bot/message`.
2. Add streaming endpoint only if it fits the existing SSE implementation cleanly.
3. Return enough metadata for a future WebChat UI.
4. Add tests for response shape and trace metadata.

### Phase 5: Plugin System MVP

1. Add plugin manifest schema.
2. Add plugin registry for built-in/local plugins.
3. Add lifecycle registration.
4. Add message hooks:
   - received
   - responding
5. Add command handler interface.
6. Add plugin trace output.
7. Add tests for manifest validation, registration, and hook execution.

### Phase 6: CLI Repositioning

1. Keep CLI commands functional.
2. Update CLI help/readme copy to describe CLI as admin/debug/developer tooling.
3. Avoid adding new long-term memory UX to CLI as part of this goal.
4. Keep CLI chat only as smoke test/debug path.
5. Ensure CLI chat does not write into Bot long-term memory by default.
6. Document future independent coding-agent direction separately from the Bot platform.

### Phase 7: Documentation and Verification

1. Update `README.md`.
2. Add or update architecture docs for Bot Runtime.
3. Update OpenSpec specs or create a new OpenSpec change if required by the workflow.
4. Run:
   - `npx tsc --noEmit`
   - `npx vitest run`
   - lint command if configured
5. Provide final summary and remaining risks.

## 13. Acceptance Criteria

Must satisfy ALL of the following:

1. Documentation clearly states yunluostar is a multi-platform cognitive Agentic Bot platform.
2. Documentation clearly states yunluostar is not primarily a Claude Code-like CLI agent.
3. Documentation clearly states CLI is admin/debug/developer tooling.
4. Documentation records that CLI may later become a separate self-developed coding agent, but that is not the current Bot platform's main path.
5. Existing runtime-backed architecture is preserved and reframed as Bot Runtime.
6. No goal or implementation step requires deleting `src/runtime/`, `src/runtime-client/`, `src/protocol/`, or cognitive core modules.
7. Bot protocol schemas exist and are Zod-validated.
8. Bot request validation rejects invalid payloads with useful errors.
9. Bot scope includes platform, adapter, conversation, sender user, and session identity.
10. Bot messages can be handled through a non-CLI runtime path.
11. HTTP webhook adapter can submit a message and receive a response.
12. WebChat-compatible API can submit a message and receive a response.
13. Bot message handling creates or updates cognitive records according to existing pipeline behavior.
14. Bot conversations do not leak memory/session state across different Bot scopes.
15. Existing CLI commands still work after the pivot.
16. CLI is no longer documented as the primary long-term memory product surface.
17. CLI chat does not write into Bot long-term memory by default.
18. Plugin manifest schema exists.
19. Plugin registry can load and validate at least one built-in or test plugin.
20. At least one message hook can run and produce trace output.
21. Provider secrets are redacted from all displayed runtime/admin/plugin outputs.
22. Typecheck passes.
23. Tests pass.
24. Lint passes if lint is configured.
25. Final output lists modified files, verification results, and remaining risks.

### First Milestone Acceptance

The first milestone is complete when:

1. `POST /v1/bot/message` or equivalent non-CLI endpoint works with deterministic LLM mode.
2. A generic HTTP webhook payload can be normalized into Bot scope.
3. A Bot conversation produces an assistant response.
4. The conversation is recorded into the cognitive pipeline.
5. Reflection or trace metadata is returned or queryable.
6. Bot scope isolation is covered by tests.
7. CLI still starts and can inspect runtime state.
8. CLI chat, if present, is verified not to write Bot long-term memory by default.
9. README or architecture docs describe the new product direction.

## 14. Testing Requirements

### Unit Tests

1. Bot protocol validation:
   - valid request passes
   - missing required fields fail
   - invalid metadata fails safely
2. Bot scope:
   - same platform/conversation/user maps to stable session behavior
   - different conversations do not share state accidentally
   - different users do not share user-scoped state accidentally
3. HTTP webhook adapter:
   - generic payload normalizes to Bot request
   - invalid payload returns validation error
4. WebChat API:
   - request returns stable response shape
   - trace metadata is included when available
5. Plugin manifest:
   - valid manifest loads
   - invalid manifest is rejected
6. Plugin hooks:
   - message received hook runs
   - hook failure is isolated and traced
7. Secret redaction:
   - provider keys and plugin secrets are not displayed.

### Integration Tests

1. End-to-end Bot message:
   - HTTP request
   - Bot scope creation
   - cognitive response
   - memory/episode recording
   - reflection/trace metadata
2. Scope isolation:
   - same message in two conversations produces isolated records.
3. CLI compatibility:
   - existing CLI inspection commands still work.
4. CLI memory isolation:
   - CLI chat does not create Bot long-term memory records unless an explicit, separately scoped debug mode is intentionally enabled.
5. Deterministic runtime:
   - tests must not require real provider API keys.

### Manual Smoke Tests

Provide manual verification steps for:

1. Starting the runtime.
2. Sending a `POST /v1/bot/message` request.
3. Sending a generic webhook request.
4. Inspecting memory/reflection/trace output.
5. Running CLI status/help/inspection commands.

### Verification Commands

Run:

```powershell
npx tsc --noEmit
npx vitest run
```

If lint is configured, also run the project lint command.

## 15. Prohibited Actions

1. Do not implement yunluostar as a Claude Code-like coding CLI under this goal.
2. Do not make CLI the primary long-term memory product surface.
3. Do not let CLI chat write into Bot long-term memory by default.
4. Do not merge future coding-agent memory with Bot conversation memory without an explicit separate design.
5. Do not delete runtime/protocol/runtime-client as part of this pivot.
6. Do not delete or weaken memory, self model, user model, goals, or reflection.
7. Do not replace self model with persona prompt.
8. Do not copy AstrBot or openclaw internals.
9. Do not claim AstrBot/openclaw compatibility.
10. Do not implement a plugin marketplace in the first milestone.
11. Do not implement third-party IM adapters before the generic HTTP/WebChat path is proven.
12. Do not add real API keys to source, tests, docs, or examples.
13. Do not expose provider secrets through plugin APIs.
14. Do not let plugins bypass runtime scope, audit, permissions, or safety boundaries.
15. Do not introduce broad unrelated refactors.
16. Do not upgrade dependencies without clear necessity.
17. Do not perform destructive git operations.
18. Do not fabricate test results.
19. Do not claim completion without verification.

## 16. Final Output Requirements

After each implementation phase, output:

1. Phase completed.
2. Modified files and what changed in each.
3. New APIs, protocols, or commands added.
4. Runtime boundary changes.
5. Bot scope changes.
6. Plugin system changes.
7. Database/storage changes.
8. Security boundary changes.
9. Tests added or updated.
10. Verification commands run and results.
11. Remaining risks.
12. Next recommended phase.

After the full goal is complete, output:

1. Final product positioning summary.
2. Final Bot Runtime architecture summary.
3. Bot adapter/API summary.
4. Cognitive core integration summary.
5. Plugin MVP summary.
6. CLI repositioning summary.
7. Database/scope summary.
8. Security and secret-redaction summary.
9. CLI memory isolation summary.
10. Full verification results.
11. Remaining future work:
    - full Web Dashboard
    - IM adapters such as QQ, Telegram, Discord, Slack, Feishu, DingTalk, WeCom
    - plugin marketplace
    - production webhook authentication
    - Docker and deployment packaging
    - admin-managed provider UI
    - optional per-user BYOK
    - independent self-developed coding agent split from the Bot platform
