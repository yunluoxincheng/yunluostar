## Context

The current interactive shell is implemented with Node `readline`, `chalk`, and `ora`. That approach worked while the shell only routed plain chat and a few slash commands, but Yunluostar now exposes richer cognitive state: memory, working memory, self model, goals, reflections, trace identifiers, model config, and session state. Future CLI-agent workflows also need discoverable slash commands and keyboard-driven command selection.

This change replaces only the no-subcommand interactive shell with an Ink-based React TUI. The agent controller, persistence, LLM clients, goal system, and non-interactive CLI subcommands remain the same.

## Goals / Non-Goals

**Goals:**

- Replace the default `yunluo` interactive shell with an Ink TUI.
- Add slash-command preview and keyboard selection when the user enters `/`.
- Preserve existing slash command semantics and read-only inspection behavior.
- Keep non-interactive CLI commands working without Ink UI involvement.
- Introduce a shared slash command registry used by help output, palette filtering, and interactive routing.
- Render streaming chat responses without corrupting the input line.
- Keep the TUI Windows PowerShell friendly.
- Keep core command and palette logic testable outside terminal automation.

**Non-Goals:**

- No changes to the agent cognitive pipeline.
- No new planner/action executor.
- No file editing, repo map, diff viewer, or Git workflow in this change.
- No web UI or desktop UI.
- No autonomous background execution.

## Decisions

### Decision 1: Ink replaces only the default interactive shell

`yunluo` with no subcommand will mount an Ink app. Explicit commands such as `yunluo chat --message`, `yunluo goals list`, `yunluo memory list`, and `yunluo config show` remain Commander-driven command handlers.

Rationale: this keeps the migration contained. The user-facing interactive shell becomes modern, while scripts and tests that depend on existing subcommands remain stable.

### Decision 2: Add a slash command registry as the single source of truth

Create a registry module with command metadata:

```ts
export interface SlashCommandDefinition {
  name: string;
  aliases?: string[];
  description: string;
  category: "session" | "model" | "memory" | "goals" | "reflection" | "system";
  usage: string;
  readOnly: boolean;
}
```

The registry powers:

- command palette list and filtering
- `/help` rendering
- unknown-command suggestions
- command tests

Rationale: the current shell duplicates command knowledge across router and TUI helpers. A registry prevents drift as more commands are added.

### Decision 3: Keep `InteractiveRouter` as the behavior boundary

The Ink app should delegate command execution to the existing `InteractiveRouter` where possible. The router can be adapted to use the registry, but it should remain testable without terminal rendering.

Rationale: command behavior is already covered by tests. Ink should render and collect input, not own persistence or command semantics.

### Decision 4: Separate UI state from agent runtime state

The Ink app should maintain display state:

- input text
- palette open/closed state
- selected palette index
- conversation entries
- current pipeline stage
- latest trace
- latest inspector output
- latest error

The agent runtime state remains in SQLite and the existing controller.

Rationale: this avoids turning the TUI into a second source of truth.

### Decision 5: Palette opens on slash input and remains keyboard-first

When the input starts with `/`, the command palette should display matching commands. Users can:

- type to filter
- use Up/Down to select
- press Enter to execute selected command or submit the typed command
- press Tab to complete the selected command into the input
- press Escape to close the palette

Rationale: this matches common CLI-agent affordances without requiring a full terminal IDE.

### Decision 6: Component structure stays small and focused

Proposed structure:

```text
src/cli/tui/
  app.tsx
  theme.ts
  command-registry.ts
  palette.ts
  components/
    Header.tsx
    ConversationView.tsx
    InputBar.tsx
    CommandPalette.tsx
    TraceLine.tsx
    InspectorPanel.tsx
    StatusLine.tsx
    ErrorBox.tsx
  hooks/
    useCommandPalette.ts
    useInteractiveAgent.ts
```

Rationale: this creates a modern TUI surface without scattering React code through CLI command handlers.

### Decision 7: Keep a narrow fallback path during migration

The current string rendering helpers may be kept temporarily as legacy utilities or renamed to avoid naming conflicts. The final `runInteractiveShell` should use Ink by default, but preserving small formatting helpers for non-interactive display is acceptable.

Rationale: this reduces migration risk and lets implementation proceed in small steps.

## Risks / Trade-offs

- [Risk] Ink rendering may behave differently in Windows PowerShell. → Mitigation: add a manual smoke-test checklist and run `yunluo` in PowerShell before completion.
- [Risk] Streaming tokens can fight with input rendering. → Mitigation: store streaming output in React state and render it in a conversation area instead of writing tokens directly to stdout.
- [Risk] Key handling can break Chinese text input. → Mitigation: use stable text input behavior where possible and test normal Chinese chat input manually.
- [Risk] Component tests become brittle. → Mitigation: test command registry and palette filtering as pure logic; keep Ink render tests focused on critical states.
- [Risk] Adding React/Ink increases dependency footprint. → Mitigation: keep dependencies minimal and avoid pulling in a large TUI framework stack beyond Ink and React.

## Migration Plan

1. Add Ink/React dependencies and TypeScript JSX configuration if required.
2. Add command registry and pure filtering/selection helpers.
3. Build Ink components behind the existing `runInteractiveShell` entrypoint.
4. Move chat processing from direct stdout writes into TUI state updates.
5. Keep existing non-interactive commands unchanged.
6. Update README interactive shell documentation.
7. Run automated tests and manual Windows PowerShell smoke tests.

## Open Questions

- Should `ink-text-input` be used for the first implementation, or should the app implement input handling directly with Ink `useInput`? The implementation should prefer the simpler route that preserves Chinese input reliably.
- Should Enter on a selected palette item execute immediately or fill the input first? The MVP should execute exact read-only commands and fill commands that require arguments such as `/session`.
- Should the old text TUI be retained as a fallback flag? The MVP can keep helpers internally, but a user-facing fallback flag is not required unless Ink proves unstable on Windows.
