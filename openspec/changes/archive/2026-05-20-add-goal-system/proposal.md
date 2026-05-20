## Why

Yunluostar already has long-term memory, reflection, working memory, and retrieval, but its `goals` state is still mostly passive storage. The next step is to let the agent maintain explicit goal structure so past experience and current working state can influence what it chooses to prioritize next.

## What Changes

- Add a Goal System MVP that manages core, long-term, medium-term, short-term, and operational goals.
- Extend goal persistence beyond the current minimal table shape with goal type, mutability, approval requirements, evidence, source episode, and conflict metadata.
- Add a goal manager that can initialize immutable core goals, derive candidate goals from interaction outcomes, rank active goals, and select the current goal for Working Memory.
- Add goal conflict detection that preserves core safety and honesty goals over lower-priority mutable goals.
- Add auditability for goal creation, update, approval, rejection, pausing, completion, and conflict resolution.
- Extend CLI/TUI goal surfaces so users can inspect goal hierarchy and explicitly approve, reject, pause, or complete suggested goals without opaque hidden behavior.
- Keep the scope below a full planner: this change chooses and maintains goals, but does not execute multi-step external actions.

## Capabilities

### New Capabilities

- `goal-system`: Maintains layered goals, suggested goals, goal priority, approval state, and conflict detection for the agent.

### Modified Capabilities

- `interactive-yunluo-cli`: Goal inspection in the interactive shell remains read-only but should display the richer goal hierarchy introduced by this change.

## Impact

- Affects `src/db/schema.ts`, migrations, and goal repository code.
- Adds goal-system domain logic under `src/models/` and/or `src/planning/`.
- Integrates selected goals with `src/agent/controller.ts` and `src/models/working-memory.ts`.
- Extends reflection/consolidation or nearby LLM-safe-output boundaries to produce suggested goal candidates.
- Extends CLI/TUI goal inspection and explicit goal transition commands, with tests for goal ranking, approval, conflict detection, and Working Memory integration.
- No new external service dependency is expected.
