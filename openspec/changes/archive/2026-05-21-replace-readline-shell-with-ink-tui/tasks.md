## 1. Dependencies and Project Setup

- [x] 1.1 Add Ink and React runtime dependencies with the smallest practical dependency set.
- [x] 1.2 Add TypeScript JSX configuration needed for Ink components without disrupting existing ESM output.
- [x] 1.3 Add test support for pure palette logic and minimal Ink component rendering if a stable test library is selected.
- [x] 1.4 Confirm existing non-interactive CLI commands still build after dependency/config changes.

## 2. Slash Command Registry

- [x] 2.1 Create a shared slash command registry with name, aliases, description, category, usage, readOnly, and argument requirement metadata.
- [x] 2.2 Move `/help` command descriptions to consume the registry instead of hard-coded TUI text.
- [x] 2.3 Update interactive routing to use registry metadata for known command lookup while preserving current command behavior.
- [x] 2.4 Add pure unit tests for registry lookup, alias matching, unknown command suggestions, and command metadata consistency.

## 3. Palette Logic

- [x] 3.1 Implement pure command palette filtering by name, alias, usage, and description.
- [x] 3.2 Implement pure selection movement logic for Up/Down navigation with wraparound or bounded behavior.
- [x] 3.3 Implement command completion behavior for Tab and command execution decision behavior for Enter.
- [x] 3.4 Add unit tests for slash opening, filtering, selection, completion, execution, and Escape cancellation behavior.

## 4. Ink TUI Components

- [x] 4.1 Create `src/cli/tui/` with `app.tsx`, `theme.ts`, command registry integration, components, and hooks.
- [x] 4.2 Implement Header component showing app identity, active session, provider, and model.
- [x] 4.3 Implement ConversationView component for user messages, assistant messages, and streaming assistant output.
- [x] 4.4 Implement InputBar component for current input and keyboard handling.
- [x] 4.5 Implement CommandPalette component for slash command preview, filtering, selected item display, and keyboard affordances.
- [x] 4.6 Implement StatusLine, TraceLine, InspectorPanel, and ErrorBox components.
- [x] 4.7 Keep visual styling aligned with the Yunluostar cognitive-console identity without overwhelming terminal readability.

## 5. Interactive Agent Integration

- [x] 5.1 Replace the no-subcommand `runInteractiveShell` render path with an Ink app mount.
- [x] 5.2 Keep `InteractiveRouter` or an equivalent behavior boundary testable without real terminal automation.
- [x] 5.3 Route plain input through the existing agent controller and append user/assistant entries to TUI state.
- [x] 5.4 Render pipeline stage changes in the Ink status area instead of using `ora`.
- [x] 5.5 Render streaming tokens through React state instead of direct `process.stdout.write`.
- [x] 5.6 Render read-only slash command output in an inspector area.
- [x] 5.7 Preserve `/exit`, `/quit`, Ctrl+C, and clean process termination behavior.

## 6. Command Palette UX

- [x] 6.1 Open the command palette when input begins with `/`.
- [x] 6.2 Filter command candidates as the user types.
- [x] 6.3 Support Up/Down keyboard selection.
- [x] 6.4 Support Enter execution for commands that do not require arguments.
- [x] 6.5 Support Tab completion for the selected command usage.
- [x] 6.6 Support Escape to close the palette while preserving input.
- [x] 6.7 Ensure commands that require arguments, such as `/session`, can be completed without accidental execution.

## 7. Compatibility and Tests

- [x] 7.1 Keep existing `InteractiveRouter` tests passing or replace them with equivalent behavior tests.
- [x] 7.2 Add tests ensuring non-interactive commands remain unaffected by Ink.
- [x] 7.3 Add tests for slash-command help output using registry data.
- [x] 7.4 Add tests or a scripted smoke check for command palette rendering states where practical.
- [x] 7.5 Manually smoke test `yunluo` in Windows PowerShell: startup, Chinese input, `/`, palette navigation, `/goals`, `/wm`, streaming chat, `/exit`.

## 8. Documentation and Validation

- [x] 8.1 Update README interactive shell examples to describe the Ink TUI and slash command palette.
- [x] 8.2 Update relevant project docs if the TUI directory structure changes documented architecture.
- [x] 8.3 Run `npm run lint`.
- [x] 8.4 Run `npm test`.
- [x] 8.5 Run `openspec validate replace-readline-shell-with-ink-tui --strict`.
