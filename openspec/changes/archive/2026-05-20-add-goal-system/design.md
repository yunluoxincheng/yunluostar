## Context

The current system can record episodes, consolidate semantic/user/self memories, restore Working Memory, and inject that state into the response context. The `goals` table and `goals` CLI command exist, but goals are not yet a governing cognitive layer: they are not typed, initialized, suggested from experience, prioritized, approved, conflict-checked, or used to select Working Memory's current goal.

This change turns goals from read-only state into a small but explicit goal system. It should remain CLI-first, auditable, deterministic-test friendly, and bounded by the project's safety principle that core goals cannot be silently weakened by learned mutable goals.

## Goals / Non-Goals

**Goals:**

- Represent layered goals: core, long-term, medium-term, short-term, and operational.
- Initialize immutable core goals for safety, honesty, controllability, and user alignment.
- Derive suggested goals from episodes, reflections, and consolidation output.
- Rank active goals and select one current goal for Working Memory.
- Require explicit approval for suggested non-trivial goals before they become active.
- Detect and record conflicts between new or active goals.
- Preserve audit logs for every goal state transition.
- Expose goal state through CLI/TUI inspection in a way that is readable during local development.

**Non-Goals:**

- No autonomous external action execution.
- No multi-step planner or tool executor.
- No background scheduler or daemon.
- No web console.
- No claim that goals imply subjective agency or consciousness.

## Decisions

### Decision 1: Extend the existing `goals` table instead of adding a parallel goal store

The project already has a `goals` table and repository. We will evolve that table to include goal system fields:

- `type`: `core | long_term | medium_term | short_term | operational`
- `status`: `suggested | active | paused | completed | rejected | deprecated`
- `priority`: numeric score
- `mutable`: boolean
- `requiresApproval`: boolean
- `approvedAt`: timestamp nullable
- `sourceEpisodeId`: nullable episode reference
- `evidence`: text
- `rationale`: text
- `conflictOf`: nullable goal id
- `createdAt`, `updatedAt`

Rationale: keeping goal state in the existing table preserves the CLI surface and avoids inventing a second persistence model. A parallel `suggested_goals` table was considered, but `status = suggested` is simpler for the MVP and keeps transition history straightforward.

### Decision 2: Introduce `GoalManager` as a domain service

Add a goal manager that sits between memory/reflection/consolidation and the controller:

```text
episode + reflection + consolidation
          │
          ▼
     GoalManager
          │
          ├─ create suggested goals
          ├─ rank active goals
          ├─ detect conflicts
          └─ select current goal
          │
          ▼
   WorkingMemory.currentGoal
```

Rationale: goal logic should not live inside the controller or repository. Repositories persist state; the controller orchestrates the loop; `GoalManager` owns ranking, approval transitions, and conflict policy.

### Decision 3: Suggested goals require approval unless they are operational and low risk

Learned long-term, medium-term, and short-term goals should start as `suggested` with `requiresApproval = true`. Core goals are initialized by the system and immutable. Operational goals may be derived inside the current loop without a separate approval command if they only describe local cognitive work, such as "clarify the user's next requirement".

Rationale: this keeps user control explicit. The agent may infer goals, but durable priorities should not silently shift.

### Decision 4: Conflict detection starts rule-based

MVP conflict detection should use conservative deterministic rules before asking an LLM:

- Any goal that conflicts with a core goal is blocked or left suggested with conflict metadata.
- Goals that request deception, unsafe persistence, bypassing constraints, or unsupported capability claims conflict with core safety/honesty.
- Duplicate goals are merged or superseded instead of creating noisy active entries.
- New mutable goals with the same scope but contradictory description are marked as conflicts until approved or rejected.

Rationale: goal safety is too central to depend only on free-form model output. LLM-assisted conflict explanation can be added later, but deterministic rules give tests something crisp.

### Decision 5: Working Memory integration is selection, not ownership

The selected active goal will be copied into `WorkingMemory.currentGoal` and optionally `WorkingMemory.currentContext`. Working Memory remains the current-state window, not the source of truth for durable goals.

Rationale: goals are durable; Working Memory is session-local and snapshot-based. This separation keeps restoration simple and avoids losing goal state when snapshots are pruned.

### Decision 6: CLI remains inspection-first with explicit transitions

The existing `goals` command should evolve from a flat list into a hierarchy view. Suggested additional commands:

- `yunluo goals list`
- `yunluo goals suggest`
- `yunluo goals approve <id>`
- `yunluo goals reject <id>`
- `yunluo goals complete <id>`

The interactive shell can keep `/goals` as a read-only view initially. Mutating goal commands should stay explicit non-interactive subcommands for testability and user control.

## Risks / Trade-offs

- [Risk] Goal suggestions become noisy or overfit single conversations. → Mitigation: keep suggestions inactive by default, require evidence, confidence, and approval.
- [Risk] Goal ranking becomes opaque. → Mitigation: store rationale/evidence and expose ranking fields in CLI output.
- [Risk] Schema migration affects existing local databases. → Mitigation: additive migration with defaults; existing goals become `long_term` or `operational` active goals depending on current data needs.
- [Risk] Goal conflicts are under-detected by simple rules. → Mitigation: start conservative and test obvious unsafe/conflicting cases; later add LLM-assisted explanations behind safe validation.
- [Risk] Working Memory duplicates goal truth. → Mitigation: treat Working Memory goal as a selected projection of durable goal state, not authoritative storage.

## Migration Plan

1. Add new nullable/defaulted columns to `goals`.
2. Backfill existing rows with conservative defaults:
   - `type = long_term`
   - `mutable = true`
   - `requiresApproval = false`
   - `status` preserved when compatible
3. Initialize core goals idempotently during first goal manager use.
4. Keep existing `goals` inspection behavior working while adding richer output.
5. Rollback is manual for local MVP databases: existing added columns can be ignored by older code, but migrations are not automatically reversed.

## Open Questions

- Should suggested goals be generated during consolidation or during reflection? The initial implementation should prefer consolidation because it already turns completed interactions into durable state.
- Should goal approval be interactive-only or available as normal CLI subcommands? The initial implementation should use normal CLI subcommands first, with `/goals` staying read-only.
- Should `goal relevance` in memory retrieval wait for this change to complete? Yes; this change should expose enough selected-goal context for a later retrieval weighting pass or include a minimal first integration if low-risk.
