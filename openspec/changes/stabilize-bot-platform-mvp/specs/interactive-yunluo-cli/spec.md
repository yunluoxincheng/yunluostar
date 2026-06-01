## ADDED Requirements

### Requirement: CLI remains admin/debug tooling
The CLI SHALL remain admin, debug, developer, and inspection tooling rather than the primary Bot platform product surface.

#### Scenario: CLI inspection remains read-only by default
- **WHEN** a user runs CLI inspection commands for memory, self model, goals, reflections, runtime status, config, or permissions
- **THEN** those commands inspect Runtime state without creating new Bot long-term cognitive records

#### Scenario: CLI chat remains ephemeral by default
- **WHEN** a user sends chat input through CLI chat or the interactive shell
- **THEN** the chat does not write into Bot long-term cognitive memory, Bot reflections, Bot self model, or Bot goals by default

#### Scenario: CLI does not become Bot demo replacement
- **WHEN** the Bot Platform MVP demo flow is documented
- **THEN** the documented primary demo uses a non-CLI Bot path rather than relying only on CLI chat

#### Scenario: CLI boundary test protects Bot memory
- **WHEN** tests exercise CLI chat defaults
- **THEN** they verify CLI chat does not create Bot-scoped long-term cognitive records by default
