# yunluostar

一个主体型 Agent (consciousness-like agent) 研究原型。

## 这是什么

yunluostar 把 Agent 从 `LLM + Prompt + Tools + RAG` 的任务执行器，升级为具有持续状态、长期记忆、自我模型、目标系统和反思能力的认知系统。

它不是要宣称"AI 有主观意识"，而是要探索：**如果给 Agent 加上经历记忆、自我更新和目标管理，它能不能表现出更连贯、更自适应的行为？**

## 核心能力 (目标)

- **长期记忆** — 记住经历，而不仅是检索文档
- **工作记忆** — 维护当前任务状态和注意力焦点
- **自我模型** — 动态维护"我能做什么、我不能做什么"
- **用户模型** — 理解长期协作用户的偏好和目标
- **目标系统** — 管理长期/中期/短期目标，处理冲突
- **反思系统** — 每次交互后评估得失，驱动自我更新
- **记忆巩固** — 把经历提炼为经验、策略和行为改变

## 技术栈 (MVP)

| 层 | 选型 |
|---|------|
| 语言 / 运行时 | TypeScript + Node.js 20+ |
| 产品形态 | CLI-first 本地主体型 Agent |
| CLI | Commander |
| 结构化存储 | SQLite |
| 向量检索 | sqlite-vec 优先，LanceDB / Chroma JS client 后续可选 |
| LLM | OpenAI / Claude / Qwen / Llama API |
| ORM / Query Builder | Drizzle ORM |
| 数据校验 | Zod |
| 测试 | Vitest |
| Web / API | Hono / Fastify / React / Vue，后续可选 |

## 快速开始 (规划中)

```bash
# 项目初始化后可用
npm install
npm run cli -- chat
npm run cli -- memory list
```

## 项目状态

当前处于 **阶段 0：理论与需求定义**。架构设计文档已完成，即将进入 Sprint 1 (项目初始化)。

完整路线图见 [分阶段开发路线](docs/conscious_agent_plan/11_分阶段开发路线.md)。

## 文档

所有设计文档位于 `docs/conscious_agent_plan/`：

| 文档 | 内容 |
|------|------|
| [00_研究目标与边界](docs/conscious_agent_plan/00_研究目标与边界.md) | 项目定位、核心研究问题 |
| [01_总体架构设计](docs/conscious_agent_plan/01_总体架构设计.md) | 模块划分、交互流程 |
| [02_Cognitive_RAG](docs/conscious_agent_plan/02_Cognitive_RAG_认知记忆系统.md) | 认知记忆系统设计 |
| [09_数据模型](docs/conscious_agent_plan/09_数据模型与数据库设计.md) | 数据库表结构与向量索引 |
| [10_技术栈](docs/conscious_agent_plan/10_技术栈与工程结构.md) | 技术选型与工程目录 |
| [11_开发路线](docs/conscious_agent_plan/11_分阶段开发路线.md) | 8 阶段开发计划 |
| [12_MVP任务清单](docs/conscious_agent_plan/12_MVP_开发任务清单.md) | Sprint 分解与验收标准 |

## 项目原则

1. 记忆必须影响行为，而不仅是影响回答
2. 自我模型是动态状态，不是 prompt 人设
3. 目标系统受安全边界约束
4. 每一次行动可追踪、可解释、可回滚
