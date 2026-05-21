## MODIFIED Requirements

### Requirement: Default interactive shell
The system SHALL start an Ink-based interactive TUI shell when `yunluo` is run without a subcommand.

#### Scenario: No-argument command enters shell
- **WHEN** a user runs `yunluo` with no subcommand
- **THEN** the system opens an Ink-rendered interactive shell rather than exiting with help text

#### Scenario: Plain input sends chat message
- **WHEN** a user types non-empty input that does not begin with `/` in the interactive shell
- **THEN** the system sends that input through the agent chat loop and renders the assistant response in the conversation view

#### Scenario: Empty input is ignored
- **WHEN** a user submits empty or whitespace-only input in the interactive shell
- **THEN** the system does not create an episode and continues accepting input

#### Scenario: Streaming output does not corrupt input
- **WHEN** a chat response streams tokens while the input area is visible
- **THEN** the system renders streaming response text in the conversation area without writing raw token output over the input line

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

## ADDED Requirements

### Requirement: Slash command registry
The system SHALL define interactive slash commands in a shared registry used by help output, command palette display, and routing metadata.

#### Scenario: Help and palette use same command metadata
- **WHEN** a command description changes in the registry
- **THEN** `/help` and the command palette display the same updated command description

#### Scenario: Unknown command can reference registry
- **WHEN** a user enters an unknown slash command
- **THEN** the shell reports the command is unknown and can guide the user toward registered commands

### Requirement: Slash command palette
The Ink shell SHALL preview available slash commands when the user begins command input with `/`.

#### Scenario: Slash opens command preview
- **WHEN** the input buffer starts with `/`
- **THEN** the shell displays a command palette with matching registered slash commands

#### Scenario: Typing filters command preview
- **WHEN** the user types additional characters after `/`
- **THEN** the command palette filters visible commands by command name, alias, or description

#### Scenario: Keyboard navigation selects command
- **WHEN** the command palette is open and the user presses Up or Down
- **THEN** the selected command moves through the filtered command list without submitting chat input

#### Scenario: Enter executes selected command
- **WHEN** the command palette is open and the selected command does not require an argument
- **THEN** pressing Enter executes that slash command

#### Scenario: Enter completes argument command
- **WHEN** the command palette is open and the selected command requires an argument
- **THEN** pressing Enter fills the input with the selected command usage instead of executing an incomplete command

#### Scenario: Tab completes selected command
- **WHEN** the command palette is open
- **THEN** pressing Tab fills the input with the selected command usage instead of executing it

#### Scenario: Escape closes command palette
- **WHEN** the command palette is open and the user presses Escape
- **THEN** the palette closes while preserving the current input buffer

### Requirement: Ink TUI state surfaces
The Ink shell SHALL render the active session, model/provider summary, pipeline status, latest trace metadata, conversation history, inspector output, errors, and input area as structured TUI regions.

#### Scenario: Header shows session and model state
- **WHEN** the interactive shell is open
- **THEN** the header displays the active session and active provider/model summary

#### Scenario: Trace line appears after chat
- **WHEN** a chat turn completes with trace metadata
- **THEN** the shell displays a compact trace line containing episode, reflection, memory, model, and goal identifiers when present

#### Scenario: Inspector output is separated from chat
- **WHEN** a read-only slash command returns inspection output
- **THEN** the shell renders that output in an inspector area rather than mixing it into the streaming assistant response
