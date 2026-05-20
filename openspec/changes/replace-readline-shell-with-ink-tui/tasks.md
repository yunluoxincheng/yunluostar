## 1. Dependencies and Project Setup

- [ ] 1.1 Add Ink and React runtime dependencies with the smallest practical dependency set.
- [ ] 1.2 Add TypeScript JSX configuration needed for Ink components without disrupting existing ESM output.
- [ ] 1.3 Add test support for pure palette logic and minimal Ink component rendering if a stable test library is selected.
- [ ] 1.4 Confirm existing non-interactive CLI commands still build after dependency/config changes.

## 2. Slash Command Registry

- [ ] 2.1 Create a shared slash command registry with name, aliases, description, category, usage, readOnly, and argument requirement metadata.
- [ ] 2.2 Move `/help` command descriptions to consume the registry instead of hard-coded TUI text.
- [ ] 2.3 Update interactive routing to use registry metadata for known command lookup while preserving current command behavior.
- [ ] 2.4 Add pure unit tests for registry lookup, alias matching, unknown command suggestions, and command metadata consistency.

## 3. Palette Logic

- [ ] 3.1 Implement pure command palette filtering by name, alias, usage, and description.
- [ ] 3.2 Implement pure selection movement logic for Up/Down navigation with wraparound or bounded behavior.
- [ ] 3.3 Implement command completion behavior for Tab and command execution decision behavior for Enter.
- [ ] 3.4 Add unit tests for slash opening, filtering, selection, completion, execution, and Escape cancellation behavior.

## 4. Ink TUI Components

- [ ] 4.1 Create `src/cli/tui/` with `app.tsx`, `theme.ts`, command registry integration, components, and hooks.
- [ ] 4.2 Implement Header component showing app identity, active session, provider, and model.
- [ ] 4.3 Implement ConversationView component for user messages, assistant messages, and streaming assistant output.
- [ ] 4.4 Implement InputBar component for current input and keyboard handling.
- [ ] 4.5 Implement CommandPalette component for slash command preview, filtering, selected item display, and keyboard affordances.
- [ ] 4.6 Implement StatusLine, TraceLine, InspectorPanel, and ErrorBox components.
- [ ] 4.7 Keep visual styling aligned with the Yunluostar cognitive-console identity without overwhelming terminal readability.

## 5. Interactive Agent Integration

- [ ] 5.1 Replace the no-subcommand `runInteractiveShell` render path with an Ink app mount.
- [ ] 5.2 Keep `InteractiveRouter` or an equivalent behavior boundary testable without real terminal automation.
- [ ] 5.3 Route plain input through the existing agent controller and append user/assistant entries to TUI state.
- [ ] 5.4 Render pipeline stage changes in the Ink status area instead of using `ora`.
- [ ] 5.5 Render streaming tokens through React state instead of direct `process.stdout.write`.
- [ ] 5.6 Render read-only slash command output in an inspector area.
- [ ] 5.7 Preserve `/exit`, `/quit`, Ctrl+C, and clean process termination behavior.

## 6. Command Palette UX

- [ ] 6.1 Open the command palette when input begins with `/`.
- [ ] 6.2 Filter command candidates as the user types.
- [ ] 6.3 Support Up/Down keyboard selection.
- [ ] 6.4 Support Enter execution for commands that do not require arguments.
- [ ] 6.5 Support Tab completion for the selected command usage.
- [ ] 6.6 Support Escape to close the palette while preserving input.
- [ ] 6.7 Ensure commands that require arguments, such as `/session`, can be completed without accidental execution.

## 7. Compatibility and Tests

- [ ] 7.1 Keep existing `InteractiveRouter` tests passing or replace them with equivalent behavior tests.
- [ ] 7.2 Add tests ensuring non-interactive commands remain unaffected by Ink.
- [ ] 7.3 Add tests for slash-command help output using registry data.
- [ ] 7.4 Add tests or a scripted smoke check for command palette rendering states where practical.
- [ ] 7.5 Manually smoke test `yunluo` in Windows PowerShell: startup, Chinese input, `/`, palette navigation, `/goals`, `/wm`, streaming chat, `/exit`.

## 8. Documentation and Validation

- [ ] 8.1 Update README interactive shell examples to describe the Ink TUI and slash command palette.
- [ ] 8.2 Update relevant project docs if the TUI directory structure changes documented architecture.
- [ ] 8.3 Run `npm run lint`.
- [ ] 8.4 Run `npm test`.
- [ ] 8.5 Run `openspec validate replace-readline-shell-with-ink-tui --strict`.
