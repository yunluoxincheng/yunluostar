## Why

The project has completed the conceptual design for a consciousness-like agent, but it does not yet have a runnable system that proves the core claim: experiences should update internal state and influence later behavior. This change starts implementation with the smallest useful loop that can be built, tested, and extended safely.

## What Changes

- Add the first runnable FastAPI-based agent interaction path.
- Add SQLite-backed persistence for episodes, semantic memories, user model entries, self model entries, reflections, and audit logs.
- Add an LLM client boundary for response generation, memory extraction, and reflection, with a deterministic fallback suitable for local development and tests.
- Add an episode recorder that stores each interaction as structured experience.
- Add a memory consolidator that extracts semantic memory, user model updates, and self model update candidates from completed interactions.
- Add a memory awakener that retrieves relevant prior memories before response generation.
- Add an after-response reflection step that records what worked, what failed, lessons, and update candidates.
- Add lightweight trace identifiers so tests and inspection flows can see which memories and model entries influenced a response.
- Add correction handling that downgrades, deprecates, or supersedes outdated memories and model entries instead of silently overwriting them.
- Add tests demonstrating that prior user feedback can change later response strategy.

## Capabilities

### New Capabilities

- `mvp-memory-reflection-loop`: Defines the minimum agent loop for chat, episode recording, memory awakening, reflection, and state updates that let past experience affect future behavior.

### Modified Capabilities

None.

## Impact

- Creates the initial Python application structure under `conscious_agent/`.
- Introduces FastAPI routes for chat and model inspection.
- Introduces SQLite schema and repository code for structured agent state.
- Adds configuration for database location and LLM provider selection.
- Adds tests for the MVP memory/reflection loop and behavior-change acceptance path.
- Adds auditable correction metadata for downgraded or superseded memories and model entries.
- Does not introduce autonomous background execution, external tool execution, complex planning, world modeling, or high-risk goal mutation in this first change.
