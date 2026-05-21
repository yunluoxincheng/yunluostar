## MODIFIED Requirements

### Requirement: Ink TUI state surfaces
The Ink shell SHALL render the active session, model/provider summary, runtime connection/auth state, tool approval prompts, latest trace metadata, conversation history, inspector output, errors, and input area as structured TUI regions.

#### Scenario: Header shows runtime state
- **WHEN** the interactive shell is open
- **THEN** the header displays runtime mode and auth status alongside session and provider state

#### Scenario: Tool approval prompt appears
- **WHEN** a runtime tool request requires user approval
- **THEN** the TUI displays the requested operation and lets the user approve or deny it with slash commands

#### Scenario: Runtime errors are readable
- **WHEN** the configured runtime is unavailable or returns a protocol/auth error
- **THEN** the TUI shows a readable error instead of crashing

### Requirement: Interactive slash commands
The interactive shell SHALL support slash commands for runtime auth, runtime status, permissions, and common agent state inspection flows.

#### Scenario: Runtime status command
- **WHEN** a user enters `/runtime` or `/status`
- **THEN** the shell displays runtime connection, provider readiness, embedding readiness, storage ownership, and auth state

#### Scenario: Login and logout commands
- **WHEN** a user enters `/login <token>` or `/logout`
- **THEN** the shell updates local runtime auth token storage

#### Scenario: Permissions command
- **WHEN** a user enters `/permissions`
- **THEN** the shell displays the effective local tool permission policy
