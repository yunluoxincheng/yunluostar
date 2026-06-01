## ADDED Requirements

### Requirement: Non-CLI Bot Runtime path
The Runtime SHALL treat non-CLI Bot message APIs as a primary product path that routes through Runtime-owned cognition, memory, goals, reflection, audit, and scoped persistence.

#### Scenario: Bot message invokes Runtime-owned cognition
- **WHEN** a non-CLI Bot message is submitted through the Bot API or generic HTTP adapter
- **THEN** the Runtime handles it through Runtime-owned agent, memory, reflection, goal, audit, plugin, and scope behavior rather than adapter-owned cognition

#### Scenario: Bot message uses Runtime-owned provider access
- **WHEN** the Runtime handles a non-CLI Bot message
- **THEN** LLM and embedding clients are created from Runtime-owned configuration rather than adapter or demo-client configuration

#### Scenario: Bot message persistence is scoped
- **WHEN** the Runtime persists or queries Bot cognitive state for a non-CLI Bot message
- **THEN** it constrains the operation by Bot-derived user, workspace, and session scope

#### Scenario: Bot API keeps protocol validation
- **WHEN** a non-CLI Bot message reaches the Runtime API boundary
- **THEN** the request and response are validated with shared protocol schemas
