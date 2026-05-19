# real-llm-config Specification

## Purpose
TBD - created by archiving change add-real-llm-config-and-interactive-cli. Update Purpose after archive.
## Requirements
### Requirement: Configuration file loading
The system SHALL load model and runtime configuration from user-level config, project-level config, environment variables, and CLI flags using deterministic precedence.

#### Scenario: Project config overrides user config
- **WHEN** both `~/.yunluo/config.json` and `.yunluo/config.json` define the same config field
- **THEN** the project-level value is used unless an environment variable or CLI flag overrides it

#### Scenario: Environment overrides config files
- **WHEN** an environment variable defines a supported config field
- **THEN** the environment value overrides both user-level and project-level config files

#### Scenario: CLI flag overrides all persisted config
- **WHEN** a command receives a supported config field as a CLI flag
- **THEN** the CLI flag value overrides environment variables, project config, user config, and defaults for that command

### Requirement: Safe API key configuration
The system SHALL support API key configuration through environment-variable references and literal keys while preventing secrets from being printed in normal config display output.

#### Scenario: API key loaded from named environment variable
- **WHEN** config contains `apiKeyEnv` and the named environment variable is set
- **THEN** the LLM provider uses the environment variable value as the API key

#### Scenario: Config display redacts literal key
- **WHEN** a user runs a config inspection command and config contains a literal `apiKey`
- **THEN** the command output redacts the key value and does not print the full secret

#### Scenario: Explicit real provider requires credentials
- **WHEN** a real provider is selected but no API key or configured key environment variable is available
- **THEN** the system reports the missing credential, does not call the real provider, and exits the attempted operation without pretending deterministic output came from the real provider

### Requirement: OpenAI-compatible provider
The system SHALL provide an OpenAI-compatible LLM client that can call a configured chat completion endpoint for response generation, episode extraction, reflection, and consolidation.

#### Scenario: Generate response through configured provider
- **WHEN** provider is `openai-compatible` and base URL, API key, and model are configured
- **THEN** chat response generation sends a chat completion request to the configured endpoint and returns the model response

#### Scenario: Structured extraction uses validated JSON
- **WHEN** the OpenAI-compatible provider performs episode extraction, reflection, or consolidation
- **THEN** it requests structured JSON output, validates the result, and applies conservative fallback values for malformed or incomplete fields

#### Scenario: Provider request includes runtime options
- **WHEN** temperature or timeout are configured
- **THEN** the OpenAI-compatible provider applies those options to outgoing model calls

### Requirement: Deterministic fallback remains available
The system SHALL preserve deterministic mode for tests, demos, and local operation without external credentials.

#### Scenario: No provider configured
- **WHEN** no provider is configured through flags, environment, project config, or user config
- **THEN** the system uses deterministic mode

#### Scenario: Tests avoid real credentials
- **WHEN** the automated test suite runs
- **THEN** it does not require real API credentials or live network calls

### Requirement: Config management commands
The system SHALL provide CLI commands for inspecting and updating supported configuration fields.

#### Scenario: Show effective config
- **WHEN** a user runs the config show command
- **THEN** the system prints the effective resolved configuration with secrets redacted and key source indicated

#### Scenario: Set project config value
- **WHEN** a user sets a supported config field at project scope
- **THEN** the system writes the value to `.yunluo/config.json` without modifying unrelated fields

#### Scenario: Set user config value
- **WHEN** a user sets a supported config field at user scope
- **THEN** the system writes the value to `~/.yunluo/config.json` without modifying unrelated fields

