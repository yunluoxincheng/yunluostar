## ADDED Requirements

### Requirement: Bot adapter contract
The system SHALL normalize external Bot messages through adapter-owned validation before invoking the Bot Runtime.

#### Scenario: Adapter normalizes external message
- **WHEN** an external adapter receives a supported channel payload
- **THEN** it validates the payload and converts it into a `BotMessageRequest` before calling the Runtime

#### Scenario: Adapter does not own cognition
- **WHEN** an adapter handles an external payload
- **THEN** it does not directly call database repositories, LLM providers, memory consolidation, reflection, goals, or plugin hooks

#### Scenario: Invalid adapter payload is rejected before Runtime
- **WHEN** an external payload is missing required adapter fields or contains blank required values
- **THEN** adapter validation rejects the payload without invoking `runtime.handleBotMessage()`

### Requirement: Generic HTTP adapter
The system SHALL support a generic HTTP webhook payload and convert it into `BotMessageRequest`.

#### Scenario: Generic HTTP payload converts to Bot request
- **WHEN** the generic HTTP adapter receives `conversationId`, `senderUserId`, `text`, optional `platformId`, optional `adapterId`, optional `sessionId`, and optional `metadata`
- **THEN** it produces a valid `BotMessageRequest` preserving provided non-default values

#### Scenario: Generic HTTP adapter defaults to webhook identity
- **WHEN** a generic HTTP payload omits `platformId` or `adapterId`
- **THEN** the adapter assigns `platformId` as `webhook` and `adapterId` as `generic-http` before Runtime invocation

#### Scenario: Generic HTTP required fields are not defaulted
- **WHEN** a generic HTTP payload omits or blanks `conversationId`, `senderUserId`, or `text`
- **THEN** the adapter rejects the payload without defaulting those values

#### Scenario: Generic HTTP session id is scope-derived when absent
- **WHEN** a generic HTTP payload omits `sessionId`
- **THEN** the adapter leaves `sessionId` absent so the shared Bot scope helper derives the stable session id

#### Scenario: Generic HTTP adapter routes through Runtime
- **WHEN** a generic HTTP payload is accepted
- **THEN** the resulting Bot request is handled by `runtime.handleBotMessage()` rather than a separate adapter-owned chat loop

#### Scenario: Generic HTTP adapter route is available
- **WHEN** a client posts a valid generic HTTP payload to `/v1/adapters/generic-http/message`
- **THEN** the Runtime validates it through the generic HTTP adapter and returns a Bot message response

### Requirement: Demo script flow
The system SHALL provide a minimal non-CLI demo flow for sending Bot messages and viewing response metadata.

#### Scenario: Demo sends Bot message
- **WHEN** a user runs `scripts/demo-bot-platform.ts`
- **THEN** the script sends a non-CLI Bot message through the generic HTTP adapter route and displays the assistant response

#### Scenario: Demo displays trace metadata
- **WHEN** a Bot response is returned to the demo
- **THEN** the demo displays `traceId`, `sessionId`, `episodeId`, `reflectionId`, `memoryIds`, `goalIds`, and `pluginEvents` when present

#### Scenario: Demo changes Bot identity
- **WHEN** the demo script runs its isolation examples or receives identity arguments
- **THEN** it sends messages using changed `conversationId` and `senderUserId` values so scope isolation can be demonstrated

#### Scenario: Curl is documentation only
- **WHEN** the local demo flow is documented
- **THEN** curl commands are supplemental and are not the only provided non-CLI demo surface

### Requirement: Cognitive trace metadata
The system SHALL expose trace metadata for Bot conversations including trace id, session id, episode/reflection identifiers when created, recalled memory ids, goal ids, and plugin events.

#### Scenario: Bot response includes stable trace fields
- **WHEN** the Runtime returns a Bot response
- **THEN** the response includes `traceId`, `sessionId`, `episodeId`, `memoryIds`, `goalIds`, and `pluginEvents` fields with stable types

#### Scenario: Episode id is returned
- **WHEN** a Bot turn completes successfully
- **THEN** the Bot response includes the created `episodeId`

#### Scenario: Reflection id is returned or queryable
- **WHEN** a Bot turn completes in a deterministic or full cognitive path with reflection enabled
- **THEN** the Bot response includes `reflectionId` or documentation identifies the Runtime API that can query the reflection by Bot turn context

#### Scenario: Memory ids represent recalled memories
- **WHEN** the Runtime recalls memories for a Bot turn
- **THEN** the Bot response includes the recalled memory identifiers in `memoryIds`

#### Scenario: New semantic memory is queryable when created
- **WHEN** a Bot turn creates a semantic memory through synchronous or asynchronous consolidation
- **THEN** documentation or tests identify the Runtime API path for querying the created memory by Bot scope or session context

#### Scenario: Goal ids are returned when produced
- **WHEN** a Bot turn selects or suggests a goal
- **THEN** the Bot response includes the goal identifier in `goalIds`

#### Scenario: Streaming final event includes trace metadata
- **WHEN** a Bot message is handled through the streaming endpoint
- **THEN** the final stream event includes the same response trace metadata as the non-streaming response

### Requirement: Plugin safety boundary
The system SHALL run plugin hooks through Runtime-controlled APIs with error isolation, trace output, and capability checks.

#### Scenario: Plugin hook failure is isolated
- **WHEN** a plugin hook throws an error while handling a Bot message
- **THEN** the Runtime records the plugin failure in trace output and still returns the core Bot response when possible

#### Scenario: Plugin hook timeout is isolated
- **WHEN** a plugin hook exceeds the configured timeout
- **THEN** the Runtime records a timeout plugin event and continues the Bot response flow when possible

#### Scenario: Privileged plugin API requires capability
- **WHEN** a plugin calls `readMemory`, `writeMemory`, `suggestGoal`, `requestTool`, or `modifyResponse` through `PluginRuntimeContext`
- **THEN** the Runtime checks for `memory.read`, `memory.write`, `goal.suggest`, `tool.request`, or `message.modify` capability respectively before allowing the action

#### Scenario: Plugin trace emission is always available
- **WHEN** a plugin calls `emitTrace` through `PluginRuntimeContext`
- **THEN** the Runtime records a plugin trace event without requiring a privileged capability

#### Scenario: Plugin cannot bypass Runtime boundaries
- **WHEN** a plugin handles a hook or command
- **THEN** it does not receive direct database handles, provider secrets, or an external request path that bypasses Runtime scope and audit behavior

#### Scenario: Read-only plugin pass exposes no privileged API
- **WHEN** the implementation keeps plugin hooks read-only for the MVP pass
- **THEN** plugin hooks receive no privileged Runtime API except `emitTrace` and tests prove privileged actions cannot be performed

### Requirement: Bot scope isolation
The system SHALL isolate Bot cognitive records by platform, adapter, conversation, sender user, and session scope.

#### Scenario: Different conversations are isolated
- **WHEN** two Bot messages use the same platform, adapter, and sender user but different conversation ids
- **THEN** private cognitive state from one conversation is not returned in the other conversation

#### Scenario: Different sender users are isolated
- **WHEN** two Bot messages use the same platform, adapter, and conversation id but different sender user ids
- **THEN** private cognitive state from one sender user is not returned for the other sender user

#### Scenario: Different adapters are isolated
- **WHEN** two Bot messages use the same platform, conversation id, and sender user id but different adapter ids
- **THEN** adapter-scoped cognitive state is not shared across adapters

#### Scenario: Custom session ids do not bypass Bot data scope
- **WHEN** two Bot messages provide the same custom `sessionId` but different `senderUserId` or `conversationId`
- **THEN** working memory and private cognitive state remain isolated by Bot-derived data scope

#### Scenario: Scope helper derives persistence scope
- **WHEN** Bot Runtime code needs persistence or query scope for Bot data
- **THEN** it derives that scope through the shared Bot scope helper instead of hand-writing `bot:` scope strings in business logic

### Requirement: Bot Platform MVP acceptance
The system SHALL provide a verifiable Bot Platform MVP flow that demonstrates non-CLI entry, Runtime cognition, traceability, isolation, and plugin safety.

#### Scenario: Non-CLI Bot message produces assistant response
- **WHEN** the local demo flow sends a valid non-CLI Bot message
- **THEN** the Runtime returns an assistant response through the Bot message path

#### Scenario: Cognitive trace has required records
- **WHEN** a Bot message completes under a configuration that enables memory and reflection
- **THEN** the response includes `episodeId`, exposes `reflectionId` or a documented reflection query path, includes recalled `memoryIds` when recall occurs, and includes `goalIds` when goals are selected or suggested

#### Scenario: Plugin failure does not break core response
- **WHEN** a registered plugin hook fails during the demo flow
- **THEN** the core Bot response still completes when possible and the plugin event is visible in trace output

#### Scenario: Verification commands pass
- **WHEN** the change is complete
- **THEN** `npm run lint` and `npm test` pass
