## 1. Adapter Contract

- [ ] 1.1 Define a Bot adapter interface for validating external payloads and normalizing them into `BotMessageRequest`.
- [ ] 1.2 Add generic HTTP adapter schema and normalization helpers under `src/adapters/generic-http/`.
- [ ] 1.3 Add unit tests for valid generic HTTP payloads, invalid payloads, metadata preservation, and defaulting only `platformId=webhook` and `adapterId=generic-http`.
- [ ] 1.4 Add a boundary test or static check proving adapters do not directly import DB repositories, LLM providers, memory consolidation, reflection, goals, or plugin hook internals.
- [ ] 1.5 Verify `conversationId`, `senderUserId`, and `text` are always required and blank values are rejected.

## 2. Runtime Integration

- [ ] 2.1 Add `POST /v1/adapters/generic-http/message` and route accepted generic HTTP payloads through `runtime.handleBotMessage()` using the explicit normalization boundary.
- [ ] 2.2 Preserve `POST /v1/bot/message` for already-normalized Bot requests.
- [ ] 2.3 Ensure non-streaming Bot responses include stable `traceId`, `sessionId`, `episodeId`, `memoryIds`, `goalIds`, and `pluginEvents` fields.
- [ ] 2.4 Ensure `reflectionId` is returned in deterministic/full cognitive paths with reflection enabled or document and test the Runtime API query path.
- [ ] 2.5 Ensure `sessionId`, when omitted from generic HTTP payloads, is derived by the shared Bot scope helper rather than by the adapter.
- [ ] 2.6 Ensure Bot streaming final events include the same trace metadata contract as non-streaming responses.
- [ ] 2.7 Add integration tests for adapter payload -> Runtime -> assistant response -> cognitive trace metadata.

## 3. Demo Surface

- [ ] 3.1 Add `scripts/demo-bot-platform.ts` as the required non-CLI demo surface for sending Bot messages through the generic HTTP adapter route.
- [ ] 3.2 Display assistant response plus `traceId`, `sessionId`, `episodeId`, `reflectionId`, `memoryIds`, `goalIds`, and `pluginEvents`.
- [ ] 3.3 Include two identity isolation examples using different `conversationId` and `senderUserId` values.
- [ ] 3.4 Add a smoke test or documented curl flow as supplemental documentation that can run locally without real IM credentials.
- [ ] 3.5 Optionally add a lightweight static WebChat page, but do not rely on curl alone as the MVP demo surface.

## 4. Cognitive Trace

- [ ] 4.1 Audit current trace fields from the agent controller, Bot Runtime path, memory awakening, reflection, goals, and plugin events.
- [ ] 4.2 Fill missing trace metadata where practical without broad refactors or database migrations.
- [ ] 4.3 Add tests proving successful Bot turns return `episodeId`.
- [ ] 4.4 Add tests proving reflection-enabled deterministic/full cognitive paths return `reflectionId` or expose the documented reflection query path.
- [ ] 4.5 Add tests proving recalled memory ids appear in `memoryIds` when recall occurs and new semantic memories are queryable when created.
- [ ] 4.6 Add tests proving selected or suggested goals appear in `goalIds`.
- [ ] 4.7 Ensure trace output does not expose prompts, provider secrets, auth tokens, or raw internal records.

## 5. Plugin MVP Hardening

- [ ] 5.1 Extend plugin manifest validation with optional `entry` or config schema support if needed for MVP registration.
- [ ] 5.2 Add Runtime-controlled hook timeout behavior.
- [ ] 5.3 Add hook error isolation so plugin failures produce trace events and do not break the core Bot response when possible.
- [ ] 5.4 Define MVP plugin capabilities: `message.read`, `message.modify`, `memory.read`, `memory.write`, `goal.read`, `goal.suggest`, and `tool.request`.
- [ ] 5.5 Add or explicitly withhold privileged `PluginRuntimeContext` APIs: `readMemory`, `writeMemory`, `suggestGoal`, `requestTool`, and `modifyResponse`, with capability checks for any API exposed.
- [ ] 5.6 Ensure `emitTrace` is available for plugin trace events without privileged capability.
- [ ] 5.7 Ensure plugin events and failures appear in Bot response trace metadata or Bot stream events.
- [ ] 5.8 Add tests for plugin failure isolation, timeout behavior, trace output, and capability enforcement or read-only API withholding.

## 6. Scope Isolation

- [ ] 6.1 Centralize new Bot persistence and query scope usage through Bot scope helpers.
- [ ] 6.2 Keep existing `bot:` scope prefix compatibility for MVP storage.
- [ ] 6.3 Add tests for platform, adapter, conversation, sender user, and session isolation.
- [ ] 6.4 Add tests proving different conversations/users do not share private cognitive state.
- [ ] 6.5 Add tests proving the same custom `sessionId` cannot bypass Bot-derived data scope across different `senderUserId` or `conversationId` values.
- [ ] 6.6 Verify CLI chat defaults do not write Bot-scoped long-term memory, reflections, self model, or goals.

## 7. Documentation and Verification

- [ ] 7.1 Update README and runtime architecture docs with adapter contract, generic HTTP adapter route, and demo script flow.
- [ ] 7.2 Document local smoke test commands for starting Runtime and sending Bot messages.
- [ ] 7.3 Document plugin safety boundaries and trace metadata fields.
- [ ] 7.4 Run `npm run lint`.
- [ ] 7.5 Run `npm test`.
- [ ] 7.6 Confirm the minimal non-CLI demo script can be run locally and shows trace metadata.
