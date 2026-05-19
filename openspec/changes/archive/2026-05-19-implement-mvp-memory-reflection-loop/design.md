## Context

The repository currently contains planning documents for a consciousness-like agent, but no runnable application code. The first implementation should therefore establish the smallest end-to-end system that proves the central design principle: an interaction becomes recorded experience, experience becomes structured memory and model updates, and later responses can be influenced by that state.

The design follows the updated MVP direction: TypeScript + Node.js 20+, npm-managed scripts, a Commander-based CLI, SQLite for structured state, Drizzle for schema/repository boundaries, Zod for validation, and a pluggable LLM client. sqlite-vec is the preferred local vector path, while LanceDB, Chroma, Qdrant, or Milvus remain useful later. The first loop should stay easy to run, test, and inspect from the terminal.

## Goals / Non-Goals

**Goals:**

- Create a runnable CLI application with a `chat` command.
- Persist each interaction as an episode with extracted intent, action, outcome, lesson, importance, confidence, and status.
- Maintain semantic memory, user model, self model, minimal goals, reflections, and audit logs in SQLite.
- Retrieve relevant prior memories before generating a response.
- Generate a post-response reflection and memory/model update candidates after each interaction.
- Provide deterministic local behavior for tests when no external LLM provider is configured.
- Provide read-only CLI inspection commands for episodes, semantic memories, user model entries, self model entries, goals, and reflections.
- Demonstrate that user feedback can change later response strategy.

**Non-Goals:**

- No autonomous background loop.
- No Web/API server in this first change.
- No external tool execution.
- No full planner/action executor system.
- No world model implementation.
- No LanceDB/Chroma/Qdrant/Milvus integration in this first change.
- No goal mutation, goal priority automation, or user-approved autonomous goal management beyond storing and inspecting initial safe goals.
- No claim that the agent has subjective experience.

## Product Shape

This change is CLI-first. The CLI is the user-facing entry point and should call the same Agent Runtime modules future Web/API or desktop surfaces can reuse.

Expected command shape:

```text
npm run cli -- chat
npm run cli -- chat --session <session_id> --message <message>
npm run cli -- memory list
npm run cli -- memory show <memory_id>
npm run cli -- self show
npm run cli -- goals list
npm run cli -- reflections list
```

Interactive `chat` mode is useful for manual exploration. Flag-based commands are useful for deterministic tests and scripted demos.

## Decisions

### Use SQLite as the MVP source of truth

SQLite will store `episodes`, `semantic_memories`, `user_model`, `self_model`, minimal `goals`, `reflections`, and `audit_logs`. This matches the project documentation and keeps the first implementation inspectable, portable, and easy to reset during tests.

The first goals implementation is intentionally read-only from the CLI and limited to seeded safe goals or simple records needed for inspection. Goal prioritization, autonomous goal changes, and approval workflows remain later work.

Alternative considered: PostgreSQL. It is better for long-running multi-user deployments, but it adds operational overhead before the core loop is proven.

### Use TypeScript, Commander, Zod, Drizzle, and npm for the MVP

The MVP should use TypeScript and Node.js because the project is now CLI-first and may later share runtime code with Web or desktop interfaces. Commander provides a simple command surface, Zod validates configuration and LLM structured outputs, Drizzle owns database schema/migrations, and npm is the package manager.

Alternative considered: keep Python/FastAPI. That was a reasonable earlier default, but it now conflicts with the CLI-first TypeScript plan and would create unnecessary cross-language friction before the runtime exists.

### Use a local-first memory retrieval baseline

The memory awakener will initially combine status filtering, confidence, importance, recency, and deterministic lexical scoring. If sqlite-vec is practical in the initial setup, it may be used behind the same retrieval interface; otherwise the interface should still leave room for adding sqlite-vec embeddings without changing the controller contract.

Alternative considered: introduce Chroma or Qdrant immediately. That aligns with the long-term plan, but it makes early tests more brittle and increases setup cost before the MVP behavior is validated.

### Keep the LLM client behind a narrow interface

The application will call an `LLMClient` abstraction for response generation, episode extraction, memory consolidation, and reflection. A deterministic implementation will be available for tests and local development. Provider-backed implementations can be added later.

Alternative considered: directly call an external API from the controller. That would make the first implementation harder to test and would mix orchestration with provider-specific details.

### Treat self model updates as evidence-backed records

The first implementation may write self model entries automatically only when they include evidence and confidence. Mutable fields must be explicit. Updates must produce audit log entries so later safety and rollback workflows have a trail.

Alternative considered: store a single self prompt. That is simpler, but it contradicts the project principle that self model is dynamic structured state rather than a prompt persona.

### Preserve correction history instead of overwriting state

When the user corrects a stored memory or preference, the old record should be downgraded, deprecated, or linked to a replacement record. Repository models should support status and supersession metadata for memories and model entries, and every correction should produce an audit log entry.

Alternative considered: overwrite old values in place. That is easier to implement, but it hides why behavior changed and weakens the project's auditability principle.

### Return lightweight trace identifiers from CLI chat

The chat command should print response text plus identifiers such as `episode_id`, `reflection_id`, `recalled_memory_ids`, and `applied_user_model_ids`. These identifiers make the MVP behavior testable without relying only on subjective response wording. A `--json` output option may be used by tests and scripted demos.

Alternative considered: expose traces only through logs. Logs are useful for debugging, but they are harder to assert in CLI tests and less helpful for inspection commands.

### Use a single controller for the first loop

`src/agent/controller.ts` should orchestrate the MVP flow:

```text
load state
→ awaken memories
→ build cognitive context
→ generate response
→ record episode
→ reflect
→ consolidate memories and model updates
→ audit key writes
```

This keeps the first path understandable. The module boundaries should still match the planned architecture so later changes can split planner, goal system, and world model behavior cleanly.

## Risks / Trade-offs

- Weak retrieval quality without embeddings → keep the retrieval interface replaceable and add tests around relevance rather than implementation details.
- LLM extraction may produce malformed data → validate all model outputs with Zod and fall back to conservative records when extraction fails.
- False or low-confidence memories may affect behavior → require confidence/status fields and prevent low-confidence or conflicted memories from strongly influencing responses.
- Corrections may erase useful evidence → preserve old records with status/supersession metadata and audit logs instead of destructive overwrites.
- Self model can drift into persona claims → store evidence-backed functional traits only and keep subjective-consciousness claims out of allowed generated state.
- The first controller may become too broad → keep helper modules for memory, metacognition, database, and LLM boundaries even if the orchestration is still simple.
- Tests using an external model would be flaky → default tests to the deterministic LLM client.
