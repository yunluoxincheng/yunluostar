## Context

The repository currently contains planning documents for a consciousness-like agent, but no runnable application code. The first implementation should therefore establish the smallest end-to-end system that proves the central design principle: an interaction becomes recorded experience, experience becomes structured memory and model updates, and later responses can be influenced by that state.

The design follows the existing MVP direction: Python 3.11+, FastAPI, SQLite for structured state, Pydantic for boundaries, and a pluggable LLM client. Chroma or another vector store remains useful later, but this first loop can use SQLite plus deterministic scoring so the system is easy to test and inspect.

## Goals / Non-Goals

**Goals:**

- Create a runnable FastAPI application with a `/chat` interaction endpoint.
- Persist each interaction as an episode with extracted intent, action, outcome, lesson, importance, confidence, and status.
- Maintain semantic memory, user model, self model, reflections, and audit logs in SQLite.
- Retrieve relevant prior memories before generating a response.
- Generate a post-response reflection and memory/model update candidates after each interaction.
- Provide deterministic local behavior for tests when no external LLM provider is configured.
- Demonstrate that user feedback can change later response strategy.

**Non-Goals:**

- No autonomous background loop.
- No external tool execution.
- No full planner/action executor system.
- No world model implementation.
- No Chroma/Qdrant integration in this first change.
- No high-risk goal mutation or user-approved autonomous goal management.
- No claim that the agent has subjective experience.

## Decisions

### Use SQLite as the MVP source of truth

SQLite will store `episodes`, `semantic_memories`, `user_model`, `self_model`, `reflections`, and `audit_logs`. This matches the project documentation and keeps the first implementation inspectable, portable, and easy to reset during tests.

Alternative considered: PostgreSQL. It is better for long-running multi-user deployments, but it adds operational overhead before the core loop is proven.

### Delay vector database integration

The memory awakener will initially combine simple lexical matching, status filtering, confidence, importance, and recency. This creates a predictable testable baseline. The repository layer should leave room for adding embeddings later without changing the controller contract.

Alternative considered: introduce Chroma immediately. That aligns with the long-term plan, but it makes early tests more brittle and increases setup cost before the MVP behavior is validated.

### Keep the LLM client behind a narrow interface

The application will call an `LLMClient` abstraction for response generation, episode extraction, memory consolidation, and reflection. A deterministic implementation will be available for tests and local development. Provider-backed implementations can be added later.

Alternative considered: directly call an external API from the controller. That would make the first implementation harder to test and would mix orchestration with provider-specific details.

### Treat self model updates as evidence-backed records

The first implementation may write self model entries automatically only when they include evidence and confidence. Mutable fields must be explicit. Updates must produce audit log entries so later safety and rollback workflows have a trail.

Alternative considered: store a single self prompt. That is simpler, but it contradicts the project principle that self model is dynamic structured state rather than a prompt persona.

### Preserve correction history instead of overwriting state

When the user corrects a stored memory or preference, the old record should be downgraded, deprecated, or linked to a replacement record. Repository models should support status and supersession metadata for memories and model entries, and every correction should produce an audit log entry.

Alternative considered: overwrite old values in place. That is easier to implement, but it hides why behavior changed and weakens the project's auditability principle.

### Return lightweight trace identifiers from chat

The chat endpoint should return response text plus identifiers such as `episode_id`, `reflection_id`, `recalled_memory_ids`, and `applied_user_model_ids`. These identifiers make the MVP behavior testable without relying only on subjective response wording.

Alternative considered: expose traces only through logs. Logs are useful for debugging, but they are harder to assert in API tests and less helpful for inspection clients.

### Use a single controller for the first loop

`agent/controller.py` should orchestrate the MVP flow:

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
- LLM extraction may produce malformed data → validate all model outputs with Pydantic and fall back to conservative records when extraction fails.
- False or low-confidence memories may affect behavior → require confidence/status fields and prevent low-confidence or conflicted memories from strongly influencing responses.
- Corrections may erase useful evidence → preserve old records with status/supersession metadata and audit logs instead of destructive overwrites.
- Self model can drift into persona claims → store evidence-backed functional traits only and keep subjective-consciousness claims out of allowed generated state.
- The first controller may become too broad → keep helper modules for memory, metacognition, database, and LLM boundaries even if the orchestration is still simple.
- Tests using an external model would be flaky → default tests to the deterministic LLM client.
