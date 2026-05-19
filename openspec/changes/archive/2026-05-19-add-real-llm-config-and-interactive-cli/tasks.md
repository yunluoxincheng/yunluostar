## 1. Configuration System

- [x] 1.1 Expand the config schema to include provider, base URL, API key, API key environment variable, model, temperature, timeout, default session, and database path.
- [x] 1.2 Add user-level config loading from `~/.yunluo/config.json`.
- [x] 1.3 Add project-level config loading from `.yunluo/config.json`.
- [x] 1.4 Implement config precedence: CLI overrides, environment variables, project config, user config, defaults.
- [x] 1.5 Add config serialization that writes only requested fields and preserves unrelated existing fields.
- [x] 1.6 Add redaction utilities for config display so literal API keys are never printed in full.
- [x] 1.7 Add `.yunluo/config.json` to local ignore coverage and add a safe example config that uses `apiKeyEnv`.
- [x] 1.8 Add tests for config precedence, missing files, invalid config values, cross-platform home path resolution, and redacted display output.

## 2. Config CLI Commands

- [x] 2.1 Add a `config` command group for showing and updating configuration.
- [x] 2.2 Implement `config show` with effective resolved config and secret redaction.
- [x] 2.3 Implement `config set <key> <value>` with project scope by default.
- [x] 2.4 Add a `--user` option for writing user-level config.
- [x] 2.5 Validate supported config keys and reject unknown keys with a clear error.
- [x] 2.6 Add shared CLI override flags for provider, base URL, model, temperature, timeout, and session where they affect command execution.
- [x] 2.7 Add CLI tests for show, project set, user set, command override flags, unknown key rejection, and secret redaction.

## 3. OpenAI-Compatible LLM Provider

- [x] 3.1 Add an `OpenAICompatibleLLMClient` that uses Node 20+ built-in `fetch`.
- [x] 3.2 Implement response generation through a configured chat completion endpoint.
- [x] 3.3 Implement episode extraction prompts that request structured JSON and pass through existing safe extraction validation.
- [x] 3.4 Implement reflection prompts that request structured JSON and pass through existing safe reflection validation.
- [x] 3.5 Implement consolidation prompts that request structured JSON and pass through existing safe consolidation validation.
- [x] 3.6 Apply configured model, base URL, temperature, timeout, and authorization header to provider requests.
- [x] 3.7 Handle HTTP errors, network errors, timeouts, and malformed model output with clear errors or conservative fallback behavior.
- [x] 3.8 Update provider selection to support `openai-compatible` while preserving deterministic mode.
- [x] 3.9 Ensure explicitly configured real providers fail clearly when credentials are missing instead of silently using deterministic output.
- [x] 3.10 Add mocked-fetch tests for request shape, response parsing, fallback validation, missing credential behavior, and timeout handling.

## 4. Binary Entrypoint

- [x] 4.1 Add a Node shebang-compatible CLI entrypoint for built output.
- [x] 4.2 Add `bin.yunluo` to `package.json`.
- [x] 4.3 Ensure the build output can be invoked through the `yunluo` binary after `npm link` or package installation.
- [x] 4.4 Preserve the existing `npm run cli -- ...` development path.
- [x] 4.5 Add tests or script-level verification for version/help output and explicit subcommand routing.

## 5. Interactive Shell

- [x] 5.1 Add a no-subcommand path that opens an interactive `yunluo` prompt.
- [x] 5.2 Route non-empty plain input through the existing agent chat controller using the active session.
- [x] 5.3 Ignore empty or whitespace-only interactive input without creating episodes.
- [x] 5.4 Add an interactive command router that can be tested without a real terminal session.
- [x] 5.5 Implement `/help`, `/exit`, and `/quit`.
- [x] 5.6 Implement `/config` and `/model` with redacted model/config display.
- [x] 5.7 Implement `/session <sessionId>` and keep subsequent chat turns on the selected session.
- [x] 5.8 Implement read-only `/memory`, `/self`, `/goals`, and `/reflections` inspection commands.
- [x] 5.9 Add tests for slash command routing, chat routing, session switching, empty input handling, and read-only inspection commands.

## 6. Documentation and Validation

- [x] 6.1 Update README with `yunluo` installation/linking, quick start, interactive shell usage, and slash commands.
- [x] 6.2 Document config file locations, precedence, supported fields, and API key safety recommendations.
- [x] 6.3 Document OpenAI-compatible provider examples for OpenAI and at least one compatible third-party or local endpoint.
- [x] 6.4 Run `npm run lint`.
- [x] 6.5 Run `npm test`.
- [x] 6.6 Run a deterministic CLI smoke test for `yunluo chat --message "Hello" --json` or the npm-script equivalent.
- [x] 6.7 Run `openspec validate add-real-llm-config-and-interactive-cli --strict`.
