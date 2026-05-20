## Why

Yunluostar's cognitive runtime has grown beyond a simple line prompt: users now need to inspect memory, working memory, goals, reflections, trace metadata, and model state during an ongoing session. The current `readline` + string-rendered TUI is becoming a bottleneck for modern CLI-agent interaction patterns such as slash-command previews, keyboard selection, structured status panels, and stable streaming output.

## What Changes

- Replace the no-subcommand interactive shell implementation with an Ink-based React TUI.
- Preserve existing non-interactive CLI commands such as `yunluo chat`, `yunluo memory`, `yunluo goals`, `yunluo config`, and `yunluo demo`.
- Add a shared slash-command registry used by `/help`, the command palette, and interactive routing.
- Add a command palette that appears when the user enters `/`, supports filtering, keyboard navigation, selection, cancellation, and command execution.
- Render the interactive shell with structured components: header/status area, conversation view, input bar, streaming response area, trace line, inspector output, and error display.
- Keep agent runtime behavior unchanged: memory, working memory, goals, reflection, LLM clients, persistence, and OpenSpec capabilities continue to use the existing controller and repositories.
- Add tests around command registry filtering, palette selection behavior, router compatibility, and Ink rendering where practical.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `interactive-yunluo-cli`: Replace the default `readline` shell with an Ink TUI and add slash-command preview/selection while preserving existing slash command semantics.

## Impact

- Adds runtime UI dependencies for Ink/React and likely test support for Ink components.
- Affects `src/cli/interactive-router.ts`, current TUI rendering helpers, and the no-subcommand `runInteractiveShell` path.
- Adds a new `src/cli/tui/` component structure and command registry.
- May keep the existing string TUI helpers as compatibility utilities or move them behind a legacy/fallback layer.
- Requires Windows PowerShell smoke testing because this project targets Windows-first terminal environments.
