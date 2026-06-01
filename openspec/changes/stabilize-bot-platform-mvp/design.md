## Context

Yunluostar already has a Runtime-owned agent loop, `/v1/bot/message`, Bot protocol schemas, Bot scope helpers, and an early plugin hook model. Those pieces prove the backend direction, but they do not yet form a crisp Bot Platform MVP: external adapter boundaries are implicit, trace metadata is not treated as a stable demo contract, plugin safety behavior is minimal, and there is no small non-CLI surface that shows the platform shape.

This change should stabilize what already exists instead of replacing it. The existing Node HTTP server remains acceptable for the MVP, `botScopeToDataScope()` remains the compatibility mapping, and CLI stays an admin/debug/developer surface rather than becoming the primary product experience.

## Goals / Non-Goals

**Goals:**

- Make the adapter boundary explicit: external payload validation and normalization happen before Runtime invocation.
- Add a generic HTTP adapter that can receive webhook-style payloads and convert them into `BotMessageRequest`.
- Provide a required non-CLI demo script that sends Bot messages, displays response plus trace metadata, and demonstrates identity isolation.
- Treat Bot response trace metadata as a stable contract for demos and tests.
- Harden plugin hooks enough that failures, slow hooks, and missing capabilities do not break core Bot response behavior.
- Add tests that prove Bot data is isolated by platform, adapter, conversation, sender user, and session.
- Document a local demo flow that can be run by a developer without real IM credentials.

**Non-Goals:**

- Real IM adapters, full dashboard, plugin marketplace, SaaS, billing, quotas, or multi-node deployment.
- Replacing the current Runtime HTTP server with Hono or another framework.
- Large database migrations or forced replacement of the existing `bot:` scope prefix.
- Adding CLI long-term memory UX or making CLI chat the main product surface.

## Decisions

### Adapter contract stays thin and Runtime-owned cognition stays central

External adapters will own payload validation, normalization, and response mapping only. They will not call the database, LLM clients, memory repositories, reflection, goals, or plugin hooks directly. The normalized flow is:

```text
external payload
  -> adapter validate and normalize
  -> BotMessageRequest
  -> runtime.handleBotMessage()
  -> BotMessageResponse
  -> adapter response mapping
```

Rationale: adapters should be replaceable channel edges, not cognitive runtimes. This keeps scope, audit, memory, and safety behavior in one place.

Alternative considered: let each adapter own channel-specific cognition and persistence. That would make early demos easy but would fragment memory, trace, and safety boundaries before the platform has a stable core.

### Generic HTTP adapter has a dedicated route and keeps the existing Bot route

Add `src/adapters/generic-http/schema.ts` and `src/adapters/generic-http/adapter.ts` with a webhook-style schema:

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

Expose `POST /v1/adapters/generic-http/message` as the dedicated generic HTTP adapter route. The route validates the external payload, normalizes it through the generic HTTP adapter, then calls `runtime.handleBotMessage()`. Keep the existing `POST /v1/bot/message` Runtime API for already-normalized Bot requests.

Only `platformId` and `adapterId` may be defaulted by the generic HTTP adapter, with defaults `webhook` and `generic-http`. `conversationId`, `senderUserId`, and `text` are always required and must be rejected when missing or blank. If `sessionId` is absent, the adapter must leave it absent so the Bot scope helper derives it.

Rationale: a generic adapter demonstrates platform shape without requiring QQ, WeChat, Telegram, Discord, Slack, Feishu, or another real channel integration.

Alternative considered: only document curl calls against `/v1/bot/message`. That is useful as a smoke test, but it leaves the adapter contract implicit and weakens the platform story.

### Demo surface has a required script and optional WebChat page

The MVP must include `scripts/demo-bot-platform.ts` as the minimum non-CLI demo deliverable. The script must:

- Send messages through the generic HTTP adapter route.
- Display assistant response.
- Display `traceId`, `sessionId`, `episodeId`, `reflectionId`, `memoryIds`, `goalIds`, and `pluginEvents` when present.
- Run or document two identity-isolation examples using different `conversationId` and `senderUserId` values.

A lightweight static WebChat page may also be added under `src/webchat-demo/` or another clearly documented demo location, but it is optional for this change. Curl examples are documentation supplements only and cannot be the sole demo surface.

Rationale: the project direction is a Bot platform. A non-CLI demo makes that visible without committing to a full dashboard.

Alternative considered: extend the Ink CLI demo. That would be faster but would blur the product boundary that this change is meant to clarify.

### Trace metadata has hard minimums and explicit optional fields

`BotMessageResponse` must always include `traceId`, `sessionId`, `episodeId`, `memoryIds`, `goalIds`, and `pluginEvents` arrays. In deterministic or full cognitive test paths where reflection is enabled, `reflectionId` must be returned or be queryable through a documented Runtime API tied to the Bot turn. `memoryIds` represent recalled memories; newly consolidated semantic memories may be asynchronous or conditional, but docs and tests must provide a query path when they are created. `goalIds` may be empty, but any selected or suggested goal produced during the turn must be returned.

Rationale: demo and integration tests need a stable trace contract, while the cognitive pipeline may still skip optional records in some configurations.

Alternative considered: expose all trace metadata only through separate inspection endpoints. That keeps responses small but makes the MVP harder to demonstrate and debug.

### Plugin hardening is Runtime-controlled and bounded

Plugin hooks should run through Runtime-controlled execution with:

- Manifest validation for `id`, `name`, `version`, `description`, `capabilities`, and optional `entry` or config schema fields where appropriate.
- Per-hook timeout.
- Error isolation so plugin failures become trace events and do not fail the core Bot response.
- Capability checks before privileged plugin runtime API calls.
- No direct plugin access to DB handles, provider secrets, or external request handling that bypasses Runtime scope/audit.

Define the first MVP capability vocabulary as:

```text
message.read
message.modify
memory.read
memory.write
goal.read
goal.suggest
tool.request
```

Define a minimal `PluginRuntimeContext` for privileged actions:

```text
emitTrace(event)              no capability required
readMemory(query)             requires memory.read
writeMemory(input)            requires memory.write
suggestGoal(input)            requires goal.suggest
requestTool(input)            requires tool.request
modifyResponse(patch)         requires message.modify
```

If an implementation keeps plugin hooks read-only in the first pass, it must still validate manifests, expose no privileged APIs except `emitTrace()`, and test that unavailable privileged actions cannot be performed.

Rationale: plugin MVP safety matters because plugins are platform extension points. The minimum useful behavior is controlled execution, visible trace, and failure isolation.

Alternative considered: postpone plugin hardening until after real adapters. That would let unsafe extension patterns spread into the MVP.

### Bot scope compatibility remains, but derivation is centralized

Keep the existing `bot:` prefix and `botScopeToDataScope()` mapping for MVP compatibility:

```text
userId = bot:<platformId>:<senderUserId>
workspaceId = bot:<platformId>:<adapterId>:<conversationId>
```

All new Bot memory, reflection, goal, session, and trace queries should use Bot scope helpers instead of hand-written scope strings. Tests should cover platform, adapter, conversation, sender user, and session isolation. A custom `sessionId` must not allow one sender user or conversation to access another Bot-derived data scope.

Rationale: this avoids a broad storage migration while still tightening the isolation contract.

Alternative considered: introduce explicit Bot scope columns immediately. That may be the right future direction, but it is larger than this stabilization change.

### CLI boundary is documented and tested as a non-product path

CLI remains useful for admin/debug/inspection and may still have ephemeral chat for development. This change must not add CLI long-term memory UX, must not treat CLI chat as the main Bot entry, and must not write CLI chat into Bot long-term cognitive state by default.

Rationale: the product pivot requires a clear boundary. CLI should help operate the platform, not define the platform experience.

Alternative considered: keep expanding CLI chat while adding adapters. That risks splitting product direction and weakening the non-CLI MVP.

## Risks / Trade-offs

- [Risk] The generic HTTP adapter duplicates fields already accepted by `BotMessageRequest`. -> Mitigation: keep normalization helpers small and test the adapter boundary directly.
- [Risk] Trace metadata may expose implementation details too early. -> Mitigation: expose stable identifiers and event summaries, not raw prompts, secrets, or internal DB records.
- [Risk] Plugin timeout/error handling can hide plugin bugs. -> Mitigation: surface plugin failures in trace output and tests while preserving the core Bot response.
- [Risk] Existing `botScopeToDataScope()` is not a perfect long-term data model. -> Mitigation: document it as MVP-compatible and centralize usage so a future explicit scope migration is easier.
- [Risk] A WebChat demo may grow into a dashboard. -> Mitigation: keep it limited to message input, response, trace metadata, and identity switching for isolation demos.

## Migration Plan

1. Add adapter interfaces and generic HTTP normalization helpers without changing existing Bot protocol semantics.
2. Route generic HTTP demo payloads through `runtime.handleBotMessage()`.
3. Stabilize response trace metadata and plugin event reporting.
4. Add the required `scripts/demo-bot-platform.ts` demo surface and optional WebChat page if useful.
5. Add focused tests for adapter validation, runtime integration, trace metadata, plugin hardening, scope isolation, and CLI ephemeral behavior.
6. Update README/runtime docs with demo and smoke test commands.

Rollback is straightforward because this change should add adapter/demo surfaces and hardening around existing Runtime APIs. Existing `/v1/bot/message` behavior should remain compatible unless tests reveal an unsafe ambiguity that must be corrected.
