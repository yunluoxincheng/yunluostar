## MODIFIED Requirements

### Requirement: Interactive slash commands
The interactive shell SHALL support slash commands for common local agent control and inspection flows.

#### Scenario: Help command lists supported commands
- **WHEN** a user enters `/help`
- **THEN** the shell lists available slash commands and their purpose

#### Scenario: Exit command closes shell
- **WHEN** a user enters `/exit` or `/quit`
- **THEN** the shell closes cleanly without creating a chat episode for that command

#### Scenario: Config command displays effective config
- **WHEN** a user enters `/config`
- **THEN** the shell displays effective configuration with secrets redacted

#### Scenario: Model command displays provider summary
- **WHEN** a user enters `/model`
- **THEN** the shell displays the active provider, model, base URL, and whether credentials are configured without printing secrets

#### Scenario: Session command changes active session
- **WHEN** a user enters `/session <sessionId>`
- **THEN** subsequent chat messages in the shell use the provided session identifier

#### Scenario: Memory inspection command is read-only
- **WHEN** a user enters `/memory`
- **THEN** the shell displays recent semantic memories without modifying persistent state

#### Scenario: Model state inspection commands are read-only
- **WHEN** a user enters `/self`, `/goals`, or `/reflections`
- **THEN** the shell displays the requested state without modifying persistent state

#### Scenario: Goal inspection command shows goal hierarchy
- **WHEN** a user enters `/goals`
- **THEN** the shell displays active and suggested goals with hierarchy, status, priority, approval requirement, and conflict state without modifying persistent state
