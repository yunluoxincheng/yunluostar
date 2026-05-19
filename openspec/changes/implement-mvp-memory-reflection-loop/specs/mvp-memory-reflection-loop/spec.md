## ADDED Requirements

### Requirement: CLI chat interaction

The system SHALL expose a CLI chat command that accepts a session identifier and user message, returns an assistant response with lightweight trace identifiers, and runs the MVP memory/reflection loop for that interaction.

#### Scenario: Successful chat response

- **WHEN** a user runs the chat command with a valid session identifier and user message
- **THEN** the system returns an assistant response associated with the same session

#### Scenario: Chat response includes trace identifiers

- **WHEN** a chat interaction completes successfully
- **THEN** the system returns trace identifiers for the recorded episode, persisted reflection when available, recalled memories, and applied model entries

#### Scenario: Empty message rejected

- **WHEN** a user runs the chat command with an empty or whitespace-only message
- **THEN** the system rejects the request with a validation error and does not create an episode

### Requirement: Episode recording

The system SHALL record every successful chat interaction as an episode containing the session, timestamp, user intent, agent action, outcome, lesson, importance, confidence, and status.

#### Scenario: Episode persisted after response

- **WHEN** a chat interaction completes successfully
- **THEN** the system persists exactly one episode for that interaction with an active status

#### Scenario: Episode includes extracted lesson

- **WHEN** the system records an episode
- **THEN** the episode contains a lesson derived from the interaction or a conservative fallback lesson if extraction is unavailable

### Requirement: Memory awakening before response

The system SHALL retrieve relevant active prior memories before generating a response and include them in the cognitive context used for response generation.

#### Scenario: Relevant memory affects context

- **WHEN** a later chat message is related to a previously stored active memory
- **THEN** the system includes that memory in the response-generation context

#### Scenario: Low confidence memory excluded from strong influence

- **WHEN** a stored memory has low confidence or a conflicted status
- **THEN** the system does not use that memory as a strong instruction for response behavior

### Requirement: Memory consolidation after response

The system SHALL consolidate a completed episode into semantic memory, user model updates, and self model update candidates when the interaction provides enough evidence.

#### Scenario: Semantic memory created from episode

- **WHEN** an episode contains a reusable lesson or stable concept
- **THEN** the system stores a semantic memory linked to the source episode with confidence and status

#### Scenario: User model updated from feedback

- **WHEN** the user gives a clear preference or correction
- **THEN** the system stores or updates a user model entry with evidence and confidence

#### Scenario: Self model update requires evidence

- **WHEN** the system creates or updates a self model entry
- **THEN** the entry includes evidence, confidence, last-updated time, and mutability metadata

### Requirement: Reflection after response

The system SHALL generate and persist a reflection after each successful response, including what worked, what failed, lessons, and update candidates.

#### Scenario: Reflection persisted

- **WHEN** a chat interaction completes successfully
- **THEN** the system persists a reflection linked to the recorded episode

#### Scenario: Reflection produces update candidates

- **WHEN** the interaction reveals a new lesson, user preference, or agent limitation
- **THEN** the reflection contains memory or self model update candidates for consolidation

### Requirement: Audit important state changes

The system SHALL write audit log entries for important internal state changes, including memory writes, user model updates, self model updates, and reflection writes.

#### Scenario: Memory write audited

- **WHEN** the system creates a semantic memory
- **THEN** the system records an audit log entry identifying the target table, target record, action type, and reason

#### Scenario: Self model update audited

- **WHEN** the system creates or updates a self model entry
- **THEN** the system records an audit log entry with the before and after values when available

### Requirement: Correction history is preserved

The system SHALL preserve correction history when user feedback invalidates a stored memory, preference, or model entry by recording status, confidence, and supersession metadata instead of silently overwriting the old record.

#### Scenario: Outdated user preference superseded

- **WHEN** the user corrects a previously stored preference
- **THEN** the system marks the outdated record as deprecated or superseded, links it to the corrected record when available, and records an audit log entry

#### Scenario: Corrected memory confidence lowered

- **WHEN** the user identifies a stored memory as incorrect
- **THEN** the system lowers the old memory confidence or changes its status so it is not used as a strong instruction in later responses

### Requirement: Inspectable internal state

The system SHALL provide read-only CLI inspection commands for recent episodes, semantic memories, user model entries, self model entries, goals, and reflections.

#### Scenario: Inspect recent episodes

- **WHEN** a user runs a read-only CLI command to inspect recent episodes for a session
- **THEN** the system returns the persisted episode summaries without modifying state

#### Scenario: Inspect model state

- **WHEN** a user runs a read-only CLI command to inspect current user or self model state
- **THEN** the system returns stored model entries with confidence and evidence

#### Scenario: Inspect goals and reflections

- **WHEN** a user runs a read-only CLI command to inspect goals or reflections
- **THEN** the system returns persisted goal or reflection summaries without modifying state

#### Scenario: Goal inspection is read-only

- **WHEN** a user runs the CLI goal inspection command
- **THEN** the system does not create, reprioritize, or mutate goals as a side effect

### Requirement: Deterministic development mode

The system SHALL support a deterministic local mode that can complete response generation, extraction, reflection, and consolidation without calling an external LLM provider.

#### Scenario: Tests run without external provider

- **WHEN** the test suite runs without LLM API credentials
- **THEN** chat-loop tests pass by using the deterministic local LLM client

#### Scenario: Provider boundary preserved

- **WHEN** an external LLM provider is configured later
- **THEN** the controller still uses the same LLM client interface for generation, extraction, and reflection

### Requirement: npm-managed TypeScript CLI project

The system SHALL be implemented as a TypeScript / Node.js CLI project managed with npm scripts.

#### Scenario: CLI command runs through npm

- **WHEN** a user runs `npm run cli -- chat` with valid input
- **THEN** the CLI invokes the agent runtime and completes the chat interaction

#### Scenario: Tests run through npm

- **WHEN** a developer runs the configured npm test command
- **THEN** the Vitest test suite runs without requiring external LLM credentials

### Requirement: Past feedback changes future behavior

The system SHALL demonstrate that stored user feedback can influence later response strategy in the same session or across persisted state.

#### Scenario: Preference feedback affects later response

- **WHEN** a user first states that they prefer implementation-focused answers over broad conceptual explanations
- **THEN** a later related chat response uses that preference from persisted memory or user model state

#### Scenario: Corrected memory is downgraded

- **WHEN** the user corrects a previously stored memory or preference
- **THEN** the system lowers or supersedes the outdated record and uses the corrected record in later context
