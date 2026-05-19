## Context

The current MVP has a working TypeScript CLI, SQLite persistence, memory awakening, reflection, consolidation, and deterministic tests. Its LLM provider boundary already exposes `generateResponse`, `extractEpisode`, `reflect`, and `consolidate`, but provider selection still falls back to the deterministic client for every non-deterministic provider.

The next product step is to make the CLI usable as a real local agent. That requires model configuration, safe API key handling, an OpenAI-compatible provider implementation, and a direct `yunluo` command that enters an interactive shell when no subcommand is provided.

The implementation must keep deterministic mode reliable for tests and offline development. It must also avoid committing secrets or requiring real network credentials in automated tests.

## Goals / Non-Goals

**Goals:**

- Support real OpenAI-compatible LLM calls for response generation, episode extraction, reflection, and consolidation.
- Add a dedicated configuration file workflow for provider, base URL, API key or API key environment variable, model, temperature, timeout, default session, and database path.
- Resolve configuration from CLI flags, environment variables, project config, user config, and defaults in a deterministic precedence order.
- Redact secrets in all config display output.
- Add a `yunluo` executable command through `package.json` `bin` metadata and a buildable CLI entrypoint.
- Make `yunluo` with no subcommand open an interactive shell.
- Add slash commands inside the shell for help, exit, config, model, session, memory, self, goals, and reflections.
- Preserve all existing subcommands and deterministic tests.

**Non-Goals:**

- No autonomous background daemon.
- No streaming response UI in this change.
- No Anthropic-native provider in this change, though the design should leave room for it.
- No tool execution, file editing, planning, or shell command execution from the agent.
- No secure OS keychain integration; environment-variable references are the first safe key path.
- No migration away from SQLite or Drizzle.

## Decisions

### Use an OpenAI-compatible provider first

The first real provider will target the common `/chat/completions` shape because it covers OpenAI and many compatible APIs such as Qwen-compatible gateways, DeepSeek-compatible gateways, local proxies, LM Studio, and Ollama compatibility modes.

Alternatives considered:

- Provider-specific clients for each vendor: better long-term fidelity, but too much surface area for the first real-provider change.
- Anthropic first: useful for Claude-like behavior, but the request/response schema differs enough to slow the MVP path.
- SDK dependency: convenient, but Node 20+ already provides `fetch`, and a simple provider keeps dependency and test surface small.

### Configuration precedence

Configuration will resolve in this order, highest to lowest:

1. CLI flags for the current command.
2. Environment variables such as `YUNLUO_PROVIDER`, `YUNLUO_BASE_URL`, `YUNLUO_API_KEY`, `YUNLUO_MODEL`, `DATABASE_URL`, and `LLM_PROVIDER`.
3. Project config at `.yunluo/config.json`.
4. User config at `~/.yunluo/config.json`.
5. Built-in defaults.

This keeps project-local behavior reproducible while allowing one-off overrides in scripts and terminals.

User config paths will resolve through Node's `os.homedir()` so the same behavior works on Windows, macOS, and Linux.

Alternatives considered:

- User config overrides project config: convenient for personal defaults, but surprising inside a repository.
- Only environment variables: simple, but poor discoverability for a CLI product.
- Only project config: reproducible, but encourages secrets in repo-local files.

### Prefer `apiKeyEnv` over literal `apiKey`

The config file will support both `apiKeyEnv` and `apiKey`, but documentation and generated examples will prefer `apiKeyEnv`. Display commands must redact literal keys and show only whether a key source is configured.

Alternatives considered:

- Reject literal API keys entirely: safer, but frustrating for local prototypes.
- Store secrets in OS keychain: stronger, but cross-platform complexity is out of scope for this change.

### Keep deterministic mode as a first-class provider

The deterministic provider remains the default when no provider is configured. If a real provider is explicitly configured but required credentials are missing, the command will fail with a clear error instead of silently using a different provider. Tests will use deterministic mode or mocked `fetch` calls for the OpenAI-compatible provider.

Alternatives considered:

- Fail when no API key is configured for an explicitly selected real provider: safer and less surprising than pretending the real provider was used.
- Always prompt for a key: friendlier later, but not needed for a spec-driven MVP.

### Add `yunluo` as the user-facing binary

The package will expose `yunluo` via `package.json` `bin`, backed by a build output entrypoint with a Node shebang. Existing `npm run cli -- ...` remains useful for development.

Alternatives considered:

- Use `yunluostar` as the binary name: more exact, but longer and less product-like.
- Only support npm scripts: simpler, but does not match the desired Claude Code-style usage.

### Implement an interactive shell as command routing, not a separate app

The interactive shell will reuse existing command handlers and repository inspection code where possible. User text that does not begin with `/` becomes a chat message. Slash commands dispatch to small internal handlers.

Alternatives considered:

- Build a rich TUI: attractive, but unnecessary for this change.
- Spawn the existing CLI process for each slash command: easy, but harder to test and slower.

## Risks / Trade-offs

- API response shape variance across OpenAI-compatible providers -> Validate outputs and fall back conservatively when structured JSON extraction fails.
- Secrets could be accidentally printed or committed -> Redact config output, prefer `apiKeyEnv` in docs and examples, ignore local project config by default, and provide a safe example config.
- A no-subcommand shell changes CLI default behavior -> Keep explicit subcommands unchanged and test both command routing modes.
- Fetch/network tests can become flaky -> Mock fetch and do not require real API credentials in CI.
- Automatic fallback to deterministic mode can hide misconfiguration -> Use deterministic mode only when no provider is configured, and fail clearly when an explicitly selected real provider is missing credentials.
- Supersession and memory behavior may become less deterministic with real models -> Keep deterministic fixtures for behavior tests and add provider-specific unit tests around request/response translation.

## Migration Plan

1. Add config schema and file loading without changing current defaults.
2. Add the OpenAI-compatible client and provider selection while preserving deterministic fallback.
3. Add `yunluo` binary metadata and build entrypoint.
4. Add the interactive shell and slash command router.
5. Update README with setup, config examples, and command usage.
6. Keep rollback simple: users can set `YUNLUO_PROVIDER=deterministic` or remove provider config to return to current behavior.

## Open Questions

- Whether project config should be committed by default or documented as local-only with `.yunluo/config.local.json` in a future change.
- Whether streaming should be prioritized immediately after this change or deferred until tool/action execution exists.
