## ADDED Requirements

### Requirement: Yunluo binary command
The system SHALL expose a `yunluo` command that can be linked or installed as the primary CLI entrypoint.

#### Scenario: Binary invokes existing subcommands
- **WHEN** a user runs `yunluo chat --message "Hello"`
- **THEN** the command invokes the same chat runtime used by the existing npm CLI path

#### Scenario: Binary supports version and help
- **WHEN** a user runs `yunluo --version` or `yunluo --help`
- **THEN** the command prints version or help output without starting a chat interaction

### Requirement: Default interactive shell
The system SHALL start an interactive shell when `yunluo` is run without a subcommand.

#### Scenario: No-argument command enters shell
- **WHEN** a user runs `yunluo` with no subcommand
- **THEN** the system opens an interactive prompt rather than exiting with help text

#### Scenario: Plain input sends chat message
- **WHEN** a user types non-empty input that does not begin with `/` in the interactive shell
- **THEN** the system sends that input through the agent chat loop and prints the assistant response

#### Scenario: Empty input is ignored
- **WHEN** a user submits empty or whitespace-only input in the interactive shell
- **THEN** the system does not create an episode and continues prompting

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

### Requirement: Existing CLI subcommands remain available
The system SHALL preserve existing non-interactive subcommands while adding the default interactive shell.

#### Scenario: Explicit chat command remains non-interactive with message flag
- **WHEN** a user runs `yunluo chat --message "Hello" --json`
- **THEN** the command prints JSON output and exits without opening the interactive shell

#### Scenario: Existing inspection commands remain available
- **WHEN** a user runs `yunluo memory list`, `yunluo self`, `yunluo goals`, or `yunluo reflections`
- **THEN** the command returns the corresponding inspection output and exits

### Requirement: Interactive shell is testable without terminal automation
The system SHALL expose shell command routing in a way that can be tested without requiring a real terminal session.

#### Scenario: Slash command routing can be unit tested
- **WHEN** tests call the interactive command router with a slash command
- **THEN** the router returns the expected action and output without reading from stdin

#### Scenario: Chat routing can be unit tested
- **WHEN** tests call the interactive command router with plain user input
- **THEN** the router invokes the agent chat path with the active session
