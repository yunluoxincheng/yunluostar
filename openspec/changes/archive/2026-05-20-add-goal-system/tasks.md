## 1. Data Model and Migration

- [x] 1.1 Extend the `goals` Drizzle schema with type, status, mutable, requiresApproval, approvedAt, sourceEpisodeId, evidence, rationale, conflictOf, and updatedAt fields.
- [x] 1.2 Update the SQLite migration path to add new goal columns with safe defaults for existing local databases.
- [x] 1.3 Update goal domain types and Zod validation for goal type, status, and transition inputs.
- [x] 1.4 Extend `GoalsRepository` with find-by-type, find-by-status, find active ranked, update status, update priority, and conflict metadata methods.
- [x] 1.5 Add repository tests for creating classified goals, backfilled defaults, status transitions, ranking order, and conflict metadata.

## 2. Core Goal Initialization

- [x] 2.1 Define immutable core goal seeds for safety, honesty, controllability, and user alignment.
- [x] 2.2 Implement idempotent core goal initialization that avoids duplicate seed goals.
- [x] 2.3 Add audit log writes for core goal creation without logging no-op duplicate initialization checks.
- [x] 2.4 Add tests proving core goals are immutable and initialization is idempotent.

## 3. Goal Manager

- [x] 3.1 Add a `GoalManager` domain service that owns goal creation, ranking, approval transitions, and current-goal selection.
- [x] 3.2 Implement suggested goal creation from consolidation or reflection output with source episode, evidence, rationale, and approval requirements.
- [x] 3.3 Implement approval, rejection, pause, completion, and supersession transitions with audit logging.
- [x] 3.4 Implement deterministic priority ranking for active goals.
- [x] 3.5 Implement duplicate detection that reuses, merges, or supersedes equivalent goals instead of creating noisy duplicates.
- [x] 3.6 Add unit tests for suggestion creation, transition rules, priority ranking, and duplicate handling.

## 4. Conflict Detection

- [x] 4.1 Implement rule-based conflict detection against immutable core goals.
- [x] 4.2 Implement conflict detection between mutable goals with contradictory scope or description.
- [x] 4.3 Persist conflict metadata and audit log entries when conflicts are detected.
- [x] 4.4 Ensure conflicted mutable goals are not automatically selected as current goals.
- [x] 4.5 Add tests for unsafe goals, duplicate goals, conflicting mutable goals, and core-goal precedence.

## 5. Agent Loop Integration

- [x] 5.1 Initialize core goals during first goal manager use without creating repeated records.
- [x] 5.2 Select the highest-priority non-conflicting active goal before response generation.
- [x] 5.3 Inject the selected goal into `WorkingMemory.currentGoal` before cognitive context assembly.
- [x] 5.4 Create suggested durable goals after reflection/consolidation when interaction evidence supports them.
- [x] 5.5 Extend chat trace output with selected goal and suggested goal identifiers.
- [x] 5.6 Add integration tests showing selected goals influence Working Memory and later responses.

## 6. CLI and TUI

- [x] 6.1 Update `yunluo goals` output to show goal hierarchy, status, priority, approval requirement, and conflict state.
- [x] 6.2 Add explicit CLI commands for approving, rejecting, pausing, completing, and listing suggested goals.
- [x] 6.3 Keep interactive `/goals` read-only while displaying suggested and active goals clearly.
- [x] 6.4 Ensure goal displays use system-state language rather than subjective desire language.
- [x] 6.5 Add CLI/router tests for goal inspection and explicit transition commands.

## 7. Documentation and Validation

- [x] 7.1 Update README goal-system usage examples.
- [x] 7.2 Update MVP task checklist and roadmap status after implementation.
- [x] 7.3 Run `npm run lint`.
- [x] 7.4 Run `npm test`.
- [x] 7.5 Run `openspec validate add-goal-system --strict`.
