## Why

Yunluostar has pivoted from a CLI-first agent into a cognitive Bot platform, but the current implementation still reads mainly as a runtime/API backend. The next change should prove the product shape: non-CLI Bot messages enter through adapters, pass through the Runtime, create traceable cognitive records, stay scope-isolated, and can be demonstrated locally.

## What Changes

- Define a clear adapter contract that validates external payloads and normalizes them into `BotMessageRequest` before invoking the Bot Runtime.
- Add a generic HTTP adapter payload shape, normalization helpers, and a dedicated `POST /v1/adapters/generic-http/message` route while preserving `POST /v1/bot/message` for normalized Bot requests.
- Provide `scripts/demo-bot-platform.ts` as the minimum non-CLI demo surface for sending Bot messages, displaying assistant response plus cognitive trace metadata, and demonstrating identity isolation.
- Stabilize Bot response trace metadata including trace id, session id, required episode id, reflection id or query path when reflection is enabled, recalled memory ids, goal ids when selected or suggested, and plugin events.
- Harden the plugin MVP with manifest fields, hook timeout/error isolation, a minimal capability vocabulary, Runtime-controlled plugin APIs, and trace output.
- Strengthen Bot scope isolation around platform, adapter, conversation, sender user, and session-derived data scope.
- Document a local demo flow and verification commands for the Bot Platform MVP.
- Keep CLI chat as admin/debug/developer tooling and avoid adding CLI long-term memory UX in this change.

Non-goals:

- Real QQ, WeChat, Telegram, Discord, Slack, Feishu, or other IM adapters.
- A full dashboard, plugin marketplace, SaaS billing, tenant quota, or multi-node deployment.
- Curl-only demo documentation as the sole demo surface.
- A coding-agent product branch or Claude Code-style primary workflow.
- A broad database migration, large framework replacement, or dependency major-version upgrade.

## Capabilities

### New Capabilities

- `bot-platform-mvp`: Covers the adapter contract, generic HTTP adapter, minimal WebChat/demo flow, cognitive trace metadata, plugin safety boundary, Bot scope isolation, and non-CLI MVP acceptance behavior.

### Modified Capabilities

- `runtime-backed-agent-platform`: Clarify that non-CLI Bot message APIs are a primary Runtime path and must route through Runtime-owned cognition, memory, goals, reflection, audit, and scoped persistence.
- `interactive-yunluo-cli`: Clarify that the CLI remains admin/debug/developer tooling and CLI chat remains ephemeral by default, without writing Bot long-term cognitive memory.

## Impact

- Affects `src/bot/`, `src/adapters/`, `src/runtime/`, `src/protocol/`, `src/plugins/`, `scripts/`, tests, README/demo docs, and runtime architecture docs.
- Adds or stabilizes API behavior around `/v1/bot/message` and any generic HTTP adapter endpoint or helper that feeds it.
- Adds focused tests for adapter validation, adapter-to-runtime integration, trace metadata, plugin failure isolation/capability enforcement, Bot scope isolation, and CLI ephemeral boundaries.
- Avoids large dependency upgrades and keeps existing `botScopeToDataScope()` compatibility unless a later change explicitly migrates scope storage.
