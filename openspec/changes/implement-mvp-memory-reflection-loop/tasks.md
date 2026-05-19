## 1. Project Foundation

- [ ] 1.1 Create the TypeScript / Node.js `src/` project structure matching the CLI-first MVP architecture.
- [ ] 1.2 Add npm-managed project configuration for TypeScript, Commander, Zod, Drizzle, Vitest, and local development commands.
- [ ] 1.3 Add application configuration for database path, LLM provider mode, deterministic local mode, and default session behavior.
- [ ] 1.4 Add a Commander CLI entrypoint with `chat`, `memory`, `self`, `goals`, `reflections`, and `demo` command groups.
- [ ] 1.5 Configure `npm run cli -- ...`, database initialization, migration, and test scripts.

## 2. Data Model and Persistence

- [ ] 2.1 Create SQLite schema for `episodes`, `semantic_memories`, `user_model`, `self_model`, `goals`, `reflections`, and `audit_logs`.
- [ ] 2.2 Implement Drizzle schema and migrations that can create the database for development and tests.
- [ ] 2.3 Implement repository methods for inserting and reading episodes.
- [ ] 2.4 Implement repository methods for semantic memories, user model entries, self model entries, goals, and reflections.
- [ ] 2.5 Add status, confidence, and supersession metadata needed to downgrade or replace outdated memories and model entries without destructive overwrites.
- [ ] 2.6 Implement audit log writes for memory, model, reflection, and correction state changes.
- [ ] 2.7 Add an abstraction for memory relevance scoring that can start with deterministic lexical scoring and later use sqlite-vec embeddings.

## 3. Domain Models and Validation

- [ ] 3.1 Define Zod schemas for CLI inputs, configuration, chat results, and inspection command output.
- [ ] 3.2 Define domain models for episodes, memories, user model entries, self model entries, reflections, and audit log entries.
- [ ] 3.3 Validate empty or whitespace-only chat messages before controller execution.
- [ ] 3.4 Add conservative defaults for importance, confidence, status, and extraction fallback fields.
- [ ] 3.5 Define trace fields for chat command output, including episode, reflection, recalled memory, and applied model entry identifiers.

## 4. LLM Client Boundary

- [ ] 4.1 Define an `LLMClient` interface for response generation, episode extraction, reflection, and consolidation.
- [ ] 4.2 Implement a deterministic local LLM client for tests and development without external API credentials.
- [ ] 4.3 Add provider selection logic that defaults to deterministic local mode when no external provider is configured.
- [ ] 4.4 Ensure malformed or incomplete LLM outputs are validated and converted to safe fallback records.

## 5. Memory and Reflection Loop

- [ ] 5.1 Implement episode recording after every successful chat response.
- [ ] 5.2 Implement memory awakening that retrieves active relevant prior state using deterministic scoring.
- [ ] 5.3 Implement cognitive context assembly from user input, recalled memories, user model state, and self model state.
- [ ] 5.4 Implement after-response reflection and persist it linked to the recorded episode.
- [ ] 5.5 Implement memory consolidation from episode and reflection into semantic memories, user model updates, and self model update candidates.
- [ ] 5.6 Prevent low-confidence or conflicted memories from strongly influencing response behavior.
- [ ] 5.7 Implement correction handling that deprecates, supersedes, or lowers confidence for outdated memories and model entries.

## 6. Agent Controller and CLI

- [ ] 6.1 Implement `src/agent/controller.ts` to orchestrate memory awakening, response generation, episode recording, reflection, consolidation, and audit logging.
- [ ] 6.2 Add `chat` CLI command that accepts optional `--session`, `--message`, and `--json` flags and returns the assistant response plus lightweight trace identifiers.
- [ ] 6.3 Add read-only CLI inspection commands for recent episodes, semantic memories, user model entries, self model entries, goals, and reflections.
- [ ] 6.4 Ensure inspection commands do not modify persistent state.
- [ ] 6.5 Add a `demo` CLI command for the memory/reflection behavior-change scenario.

## 7. Behavior Change Acceptance Path

- [ ] 7.1 Add a deterministic scenario where the user states a preference for implementation-focused answers.
- [ ] 7.2 Verify that the preference is stored in user model or memory state with evidence and confidence.
- [ ] 7.3 Verify that a later related chat response uses the stored preference.
- [ ] 7.4 Add a correction scenario where an outdated stored preference is downgraded or superseded.
- [ ] 7.5 Verify chat trace identifiers expose the recalled memory or model entry used for the later response.

## 8. Tests and Documentation

- [ ] 8.1 Add unit tests for repository persistence and audit logging.
- [ ] 8.2 Add unit tests for deterministic memory awakening and confidence/status filtering.
- [ ] 8.3 Add CLI tests for successful chat, validation failure, JSON trace output, and read-only inspection commands.
- [ ] 8.4 Add integration tests for the full chat → episode → reflection → consolidation → later behavior-change loop.
- [ ] 8.5 Add integration tests for preference correction, supersession metadata, and audit logging.
- [ ] 8.6 Document how to initialize the database, run CLI commands with npm, and run the test suite.
- [ ] 8.7 Run the test suite and confirm the MVP acceptance scenarios pass.
