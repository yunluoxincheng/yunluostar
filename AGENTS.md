# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## 项目概述

**yunluostar** — 一个主体型 Agent (consciousness-like agent) 原型。目标不是宣称"真正有主观体验的 AI"，而是构建一个具有长期记忆、自我模型、目标系统、反思机制和持续状态的认知系统。

核心思想：把 Agent 从 `LLM + Prompt + Tools + RAG` 的任务执行器，升级为具有持续状态、经历记忆、自我更新和目标管理能力的认知系统。

## 技术栈 (MVP)

- **语言**: Python 3.11+
- **Web 框架**: FastAPI
- **数据库**: SQLite (结构化), Chroma (向量检索)
- **LLM**: OpenAI / Codex / Qwen / Llama API
- **ORM**: SQLAlchemy
- **数据校验**: Pydantic

进阶方向：PostgreSQL、Qdrant/Milvus、Neo4j、Redis、Celery、Docker Compose、LangGraph/LlamaIndex

## 架构：一次完整交互流程

```
用户输入 → Input Interpreter → Working Memory → Cognitive RAG/长期记忆
→ Self Model + User Model + World Model → Goal System → Planner
→ Action Executor/Response → Metacognition Monitor → Reflection + 记忆巩固
→ Self/Goal/Memory 更新
```

核心模块：LLM Core | Cognitive RAG | Working Memory | Self Model | User Model | World Model | Goal System | Planner | Metacognition | Memory Consolidator

架构关键转变：从 `检索资料 → 生成回答` 变为 `经历记录 → 记忆巩固 → 自我更新 → 目标调整 → 行为改变`

## 工程目录结构 (规划)

```
conscious_agent/
  app/              # FastAPI 入口、配置
  agent/            # controller, input_interpreter, cognitive_integrator
  memory/           # memory_store, memory_awakener, memory_consolidator, episodic/semantic/self_memory
  models/           # working_memory, self_model, user_model, goal, world_model
  planning/         # planner, action_executor, plan_evaluator
  metacognition/    # monitor, reflector
  database/         # schema.sql, repository
  llm/              # client, prompts
  tests/
  scripts/          # init_db, run_demo
```

## 分阶段开发路线

| 阶段 | 目标 | 状态 |
|------|------|------|
| 0 | 理论与需求定义 | 当前 |
| 1 | Cognitive RAG — 结构化长期记忆 | 待开始 |
| 2 | Working Memory — 当前状态维护 | 待开始 |
| 3 | Self Model — 动态自我模型 | 待开始 |
| 4 | Goal System — 长期目标管理 | 待开始 |
| 5 | Metacognition — 认知过程检查 | 待开始 |
| 6 | Planning & Action — 多步骤行动 | 待开始 |
| 7 | World Model — 行动后果预测 | 待开始 |
| 8 | 持续运行闭环 — 全模块整合 | 待开始 |

MVP 验收标准：Agent 能保存情节记忆、抽取语义记忆、维护用户和自我模型、检索相关经历、在回答后反思、行为被过去经历影响。

## 核心数据库表

`episodes` (情节记忆) | `semantic_memories` (语义记忆) | `self_model` (自我模型) | `user_model` (用户模型) | `goals` (目标) | `working_memory_snapshots` | `reflections` (反思) | `conflicts` (冲突) | `audit_logs` (审计日志)

## 设计文档

所有设计文档在 `docs/conscious_agent_plan/` 下，按编号 00-15 组织。推荐阅读顺序：00 → 01 → 02 → 11 → 12，再按模块读 03~08。

## 项目原则

1. 功能性意识优先，主观意识暂不宣称
2. 记忆必须影响行为，而不是只影响回答
3. 自我模型是动态状态，不是 prompt 人设
4. 目标系统受安全边界约束
5. 每一次行动可追踪、可解释、可回滚
