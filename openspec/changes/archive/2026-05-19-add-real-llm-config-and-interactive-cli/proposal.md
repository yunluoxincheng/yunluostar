## Why

The MVP memory/reflection loop can run locally, but it still uses deterministic fallback behavior for all configured LLM providers, so the CLI cannot yet act as a real conversational agent. The next step is to make yunluostar usable as a local-first CLI product: configurable real model access, a persistent config file, and a Claude Code-style interactive shell entered with `yunluo`.

## What Changes

- Add a real LLM provider path for OpenAI-compatible chat completion APIs, configured by provider, base URL, API key, model, temperature, and timeout.
- Add a dedicated configuration system that reads user-level and project-level config files, environment variables, and CLI flags with deterministic precedence.
- Add safe handling for API keys, including environment-variable references and redacted config display.
- Add a package binary named `yunluo` that can be linked or installed and used directly from the command line.
- Add a default interactive CLI shell when running `yunluo` without a subcommand.
- Add internal slash commands for common inspection and control flows, including help, exit, config, model, session, memory, self, goals, and reflections.
- Preserve deterministic mode as the default fallback for tests, demos, and environments without model credentials.
- Add tests using mocked model calls rather than real network credentials.

## Capabilities

### New Capabilities

- `real-llm-config`: Configurable real LLM access through config files, environment variables, and OpenAI-compatible API calls.
- `interactive-yunluo-cli`: A direct `yunluo` command with an interactive shell and internal slash commands.

### Modified Capabilities

None.

## Impact

- Affects `package.json` by adding a `bin` entry, build expectations, and likely one HTTP client dependency or use of Node's built-in `fetch`.
- Affects `src/config.ts` by expanding configuration loading, validation, precedence, and redacted display behavior.
- Adds config file utilities for user-level and project-level config paths.
- Adds an OpenAI-compatible LLM client under `src/llm/` and updates provider selection in `src/llm/factory.ts`.
- Adds interactive CLI handlers under `src/cli/` while preserving existing subcommands.
- Updates tests to cover config precedence, mocked provider behavior, binary-friendly CLI entry, and interactive slash command routing.
- Updates README with `yunluo`, config setup, API key safety, and interactive command usage.
