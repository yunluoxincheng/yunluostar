# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**yunluostar** — 一个多平台认知型 Agentic Bot 平台。产品方向参考 AstrBot / openclaw 的 Bot 平台形态，但拥有更强的长期认知核心：长期记忆、自我模型、用户模型、目标系统、反思系统和记忆巩固。

核心定位：
- **不是** Claude Code / Codex 式的 coding CLI
- **不是** 纯本地 BYOK 终端 agent
- **是** 下一代认知型 Bot 平台，用户通过 WebChat、HTTP webhook、IM 适配器等 Bot 接口与 Agent 交互
- 认知核心（长期记忆、自我模型、目标系统、反思）是产品差异化所在

产品形态演进：
- 第一阶段：Bot Runtime + HTTP webhook + WebChat API + 插件系统 MVP
- 后续：IM 平台适配器（QQ、Telegram、Discord、Slack 等）、Web Dashboard、插件市场

### CLI 定位

CLI（`yunluo` 命令）保留为 **admin / debug / developer 工具**，用于：
- 运行时管理和状态检查
- 记忆、自我模型、目标、反思的只读检查
- 本地开发调试
- 未来独立的 coding agent 实验

CLI **不是** Bot 平台的主要产品入口。CLI chat 默认**不能**写入 Bot 平台的长期认知记忆。

## 技术栈 (MVP)

- **语言 / 运行时**: TypeScript + Node.js 20+
- **产品形态**: 多平台认知型 Agentic Bot 平台
- **Bot Runtime**: Hono / 现有 HTTP runtime
- **CLI (admin/debug)**: Commander + Ink (React TUI)
- **协议**: Zod-validated Bot message protocol
- **数据库**: SQLite (结构化), sqlite-vec (向量检索优先方案)
- **LLM**: OpenAI / Claude / Qwen / Llama API
- **ORM / Query Builder**: Drizzle ORM
- **数据校验**: Zod
- **测试**: Vitest

进阶方向：IM 适配器、Web Dashboard、插件市场、PostgreSQL、Qdrant/Chroma、Docker/Kubernetes 部署

## 架构：一次完整交互流程

```
Bot 适配器 (WebChat / HTTP Webhook / IM) → Bot Runtime
→ Input Interpreter → Working Memory → Cognitive RAG/长期记忆
→ Self Model + User Model + World Model → Goal System → Planner
→ Action Executor/Response → Metacognition Monitor → Reflection + 记忆巩固
→ Self/Goal/Memory 更新
```

Bot Runtime 核心模块：LLM Core | Cognitive RAG | Working Memory | Self Model | User Model | World Model | Goal System | Planner | Metacognition | Memory Consolidator | Plugin System

架构关键转变：从 `检索资料 → 生成回答` 变为 `Bot 消息 → 经历记录 → 记忆巩固 → 自我更新 → 目标调整 → 行为改变`

## 工程目录结构

```
src/
  bot/              # Bot 协议类型、scope 映射、adapter 接口、对话编排
  adapters/         # Bot 适配器实现
    http-webhook/   # HTTP webhook 适配器
  plugins/          # 插件 manifest、registry、lifecycle、hooks、commands
  runtime/          # Bot Runtime 服务（agent controller、LLM、embedding、memory）
  runtime-client/   # 客户端层（CLI 访问 runtime 的唯一路径）
  protocol/         # Zod-validated 协议 schema（runtime + client 共享）
  cli/              # CLI 入口与 admin/debug 命令（不是主产品入口）
  agent/            # controller, input_interpreter, cognitive_integrator
  memory/           # memory_store, memory_awakener, memory_consolidator
  models/           # working_memory, self_model, user_model, goal, world_model
  planning/         # planner, action_executor, plan_evaluator
  metacognition/    # monitor, reflector
  db/               # schema, migrations, repositories
  llm/              # client, prompts, structured output schemas
tests/
scripts/            # init-db, run-demo
```

## 分阶段开发路线

| 阶段 | 目标 | 状态 |
|------|------|------|
| 0 | 方向锁定 — 文档统一为 Bot 平台方向 | ✅ 已完成 |
| 1 | Bot Protocol & Scope — 平台无关协议 + scope 映射 | ✅ 已完成 |
| 2 | Runtime Bot Message Path — Bot 消息接入认知流水线 | ✅ 已完成 |
| 3 | HTTP Webhook Adapter — 第一个非 CLI Bot 入口 | ✅ 已完成 |
| 4 | WebChat-Compatible API — POST /v1/bot/message | ✅ 已完成 |
| 5 | Plugin System MVP — manifest, registry, hooks | ✅ 已完成 |
| 6 | CLI Repositioning — CLI ephemeral + admin/debug 定位 | ✅ 已完成 |
| 7 | Documentation & Verification — 文档验证与最终确认 | ✅ 已完成 |

### 已完成的基础能力

| 能力 | 状态 |
|------|------|
| Cognitive RAG — 结构化长期记忆 | 已完成 MVP |
| Working Memory — 当前状态维护 | 已完成 MVP |
| Self Model — 基础更新能力 | 部分完成 |
| Goal System — 目标管理 | 已完成 MVP |
| Runtime-backed 架构边界 | 已完成 |
| CLI / Runtime 协议与认证 | 已完成 |
| Bot Protocol & Scope | 已完成 MVP |
| Bot Message Path (认知流水线) | 已完成 MVP |
| HTTP Webhook Adapter | 已完成 |
| WebChat API (SSE) | 已完成 |
| Plugin System MVP | 已完成 |
| CLI ephemeral 模式 | 已完成 |

MVP 验收标准：Bot Runtime 能通过非 CLI 入口接收消息、流经认知流水线、记录长期记忆、触发反思和自我更新，且 Bot scope 隔离正确。

## 核心数据库表

`episodes` (情节记忆) | `semantic_memories` (语义记忆) | `self_model` (自我模型) | `user_model` (用户模型) | `goals` (目标) | `working_memory_snapshots` | `reflections` (反思) | `conflicts` (冲突) | `audit_logs` (审计日志)

## 设计文档

所有设计文档在 `docs/conscious_agent_plan/` 下，按编号 00-15 组织。推荐阅读顺序：00 → 01 → 02 → 11 → 12，再按模块读 03~08。

产品方向文档：`docs/goals/pivot-to-cognitive-bot-platform.md` — 定义 Bot 平台转型目标、验收标准和分阶段执行计划。

## 项目原则

1. yunluostar 是多平台认知型 Bot 平台，不是 coding CLI
2. 认知核心（记忆、自我模型、用户模型、目标、反思）是产品差异化
3. 记忆必须影响行为，而不是只影响回答
4. 自我模型是动态状态，不是 prompt 人设或 persona 配置
5. 目标系统受安全边界约束
6. 每一次行动可追踪、可解释、可回滚
7. CLI 是 admin/debug/developer 工具，不是 Bot 平台主入口
8. CLI chat 默认 ephemeral，不写入任何长期认知状态（记忆、反思、自我模型、目标）
9. 不删除 `src/runtime/`、`src/runtime-client/`、`src/protocol/` — 这些是 Bot Runtime 核心
