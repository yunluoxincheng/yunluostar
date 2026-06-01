# yunluostar

一个多平台认知型 Agentic Bot 平台。

## 这是什么

yunluostar 是一个多平台 Agentic Bot 平台，拥有持续的长期认知状态。产品方向参考 AstrBot / openclaw 的 Bot 平台形态，但拥有更强的认知核心。

**不是什么：**
- 不是 Claude Code / Codex 式的 coding CLI
- 不是纯本地 BYOK 终端 agent

**核心差异化：** 长期认知连续性 — 长期记忆、自我模型、用户模型、目标系统和反思系统让 Bot 拥有跨会话的持续状态和行为进化能力。

## 核心能力

- **长期记忆** — 记住经历，而不仅是检索文档
- **工作记忆** — 维护当前任务状态和注意力焦点
- **自我模型** — 动态维护"我能做什么、我不能做什么"
- **用户模型** — 理解长期协作用户的偏好和目标
- **目标系统** — 管理长期/中期/短期目标，处理冲突
- **反思系统** — 每次交互后评估得失，驱动自我更新
- **记忆巩固** — 把经历提炼为经验、策略和行为改变
- **Bot Runtime** — 多平台 Bot 适配器接入统一认知流水线
- **插件系统** — 可扩展的消息 hooks 和命令处理

## 技术栈

| 层 | 选型 |
|---|------|
| 语言 / 运行时 | TypeScript + Node.js 20+ |
| 产品形态 | 多平台认知型 Agentic Bot 平台 |
| Bot Runtime | 当前 Node.js 原生 HTTP runtime；Hono 可作为后续可选方向 |
| CLI (admin/debug) | Commander + Ink (React TUI) |
| 协议 | Zod-validated Bot message protocol |
| 结构化存储 | SQLite + Drizzle ORM |
| 向量检索 | sqlite-vec 优先，Qdrant / Chroma 后续可选 |
| LLM | OpenAI / Claude / Qwen / Llama API |
| 数据校验 | Zod |
| 测试 | Vitest |

## 快速开始

```bash
# 安装依赖
npm install

# 构建项目
npm run build

# 链接 yunluo 命令（全局可用）
npm link

# 初始化数据库
npm run db:init
```

### 使用 yunluo 命令

> **注意：** CLI 是 admin / debug / developer 工具，不是 Bot 平台的主要产品入口。CLI chat 默认不写入 Bot 平台的长期认知记忆。

```bash
# 直接运行 yunluo 进入交互式 shell（用于 admin/debug）
yunluo

# 非交互式对话
yunluo chat --message "Hello" --json

# 启动本地 runtime 服务（HTTP + SSE）
yunluo runtime serve --host 127.0.0.1 --port 3927

# 让 CLI 指向本地 runtime
yunluo --runtime-mode local --runtime-url http://127.0.0.1:3927

# 查看配置
yunluo config show

# 设置配置
yunluo config set provider openai-compatible
yunluo config set model gpt-4o-mini
yunluo config set apiKeyEnv OPENAI_API_KEY

# 查看记忆
yunluo memory list
yunluo memory show <memory_id>

# 查看自我模型
yunluo self

# 查看目标
yunluo goals
yunluo goals list
yunluo goals list --status suggested --json

# 目标审批/操作
yunluo goals approve <goal-id>
yunluo goals reject <goal-id>
yunluo goals pause <goal-id>
yunluo goals complete <goal-id>

# 进入交互式 shell；进入后可输入 /wm 查看工作记忆
yunluo

# 查看反思记录
yunluo reflections

# 运行演示
yunluo demo

# 也可以通过 npm scripts 运行（开发模式）
npm run cli -- chat --message "Hello" --json
```

### 交互式 Shell

运行 `yunluo` 不带子命令进入 Ink TUI 交互式 shell：

```
YUNLUOSTAR v0.1.0  consciousness-like agent
  model deterministic · session default

yunluo :: > 你好！
response ─
    Agent response here...

yunluo :: > /help
┌─ Command Surface ──────────────────────────────┐
│ /help           command map                     │
│ /exit, /quit    leave the shell                 │
│ /model          provider and model              │
│ ...                                             │
└─────────────────────────────────────────────────┘

yunluo :: > /
  › /help — command map
    /exit — leave the shell
    /model — provider and model
    ...
  ↑↓ navigate · Tab complete · Enter execute · Esc close

yunluo :: > /exit
```

交互式 shell 支持：
- 输入 `/` 打开命令面板，可用 ↑↓ 键选择、Tab 补全、Enter 执行、Esc 关闭
- 流式输出直接渲染到对话区域，不会破坏输入行
- `/exit` 或 `/quit` 或 `Ctrl+C` 退出

### 配置

配置通过以下方式管理（按优先级从高到低）：

1. **CLI flags** — `--provider`, `--model`, `--base-url`, `--temperature`, `--timeout`, `--session`, `--db`, `--runtime-mode`, `--runtime-url`
2. **环境变量** — `YUNLUO_PROVIDER`, `YUNLUO_BASE_URL`, `YUNLUO_API_KEY`, `YUNLUO_MODEL`, `YUNLUO_TEMPERATURE`, `YUNLUO_TIMEOUT`, `YUNLUO_RUNTIME_MODE`, `YUNLUO_RUNTIME_URL`, `DATABASE_URL`, `LLM_PROVIDER`
3. **项目配置** — `.yunluo/config.json`（项目级别）
4. **用户配置** — `~/.yunluo/config.json`（用户级别）
5. **内置默认值**

#### 配置文件

项目级配置文件 `.yunluo/config.json`（示例）：

```json
{
  "provider": "openai-compatible",
  "baseUrl": "https://api.openai.com/v1",
  "apiKeyEnv": "OPENAI_API_KEY",
  "model": "gpt-4o-mini",
  "temperature": 0.7,
  "timeout": 30000
}
```

> **安全提示：** 优先使用 `apiKeyEnv` 引用环境变量存储 API key，而不是直接写入 `apiKey`。`.yunluo/config.json` 已在 `.gitignore` 中排除。

#### OpenAI 兼容提供者示例

yunluo 支持任何 OpenAI 兼容的 API 端点：

```json
// OpenAI
{ "provider": "openai-compatible", "baseUrl": "https://api.openai.com/v1", "apiKeyEnv": "OPENAI_API_KEY", "model": "gpt-4o-mini" }

// DeepSeek
{ "provider": "openai-compatible", "baseUrl": "https://api.deepseek.com/v1", "apiKeyEnv": "DEEPSEEK_API_KEY", "model": "deepseek-chat" }

// Ollama（本地）
{ "provider": "openai-compatible", "baseUrl": "http://localhost:11434/v1", "model": "llama3" }

// LM Studio（本地）
{ "provider": "openai-compatible", "baseUrl": "http://localhost:1234/v1", "model": "local-model" }
```

`deterministic` 模式不需要任何外部 API，适合本地开发和测试。

### Bot Runtime 架构

yunluostar 采用 Bot Runtime 架构：

- **Bot Runtime** 拥有 agent controller、LLM provider 调用、embedding provider 调用、SQLite 记忆数据库、认知流水线（记忆、自我模型、用户模型、目标、反思）、插件执行和审计日志。
- **Bot 适配器**（WebChat、HTTP webhook、未来 IM 适配器）将外部消息标准化为平台无关的 Bot 协议，送入 Bot Runtime。
- **CLI**（`yunluo` 命令）保留为 admin/debug/developer 工具。通过 `src/runtime-client/` 访问 runtime。CLI chat 是 ephemeral 模式，不写入任何长期认知状态（记忆、反思、自我模型、目标）。
- HTTP runtime 暴露 `POST /v1/chat` SSE 流（CLI ephemeral 兼容）、`POST /v1/bot/message`（Bot 消息入口，非流式）、`POST /v1/bot/message/stream`（Bot 消息入口，SSE 流式）、`GET /v1/runtime/status`、`GET /v1/memory`、`GET /v1/memory/:id`、`GET /v1/goals`、`POST /v1/goals/transition`、`GET /v1/self`、`GET /v1/reflections`、`GET /v1/session/:id`、`POST /v1/tools/result` 和 `POST /v1/auth/login`。
- hosted 模式下用户不需要持有 provider API key；embedding key 属于 runtime/server-side 配置。
- Runtime 存储记录带有 `user_id` / `workspace_id` 作用域列，Bot 对话通过 `bot:` 前缀的 userId/workspaceId 实现平台/对话/用户隔离。

详细设计见 [`docs/runtime-architecture.md`](docs/runtime-architecture.md) 和 [`docs/goals/archive/pivot-to-cognitive-bot-platform.md`](docs/goals/archive/pivot-to-cognitive-bot-platform.md)。

### 运行测试

```bash
npm test
npm run test:coverage
```

## 项目状态

yunluostar 已完成从 CLI-first agent 研究原型到多平台认知型 Agentic Bot 平台的方向转型，当前重点是稳定 Bot Platform MVP。

### 已完成的认知核心能力

- 情节记忆录制与语义记忆提取
- 用户模型和自我模型的自动更新
- 后交互反思与记忆巩固
- 记忆唤醒（embedding / sqlite-vec 语义检索与复合评分）
- 工作记忆快照（恢复、注入认知上下文、保存、只读查看）
- 目标系统：分层目标、建议目标审批、冲突检测、CLI 管理
- Runtime-backed 架构边界（CLI / Runtime / Protocol / Runtime-Client）
- 审计日志追踪所有状态变更

### 当前阶段：Bot Platform MVP 稳定化

产品方向已从 CLI-first agent 转向多平台 Bot 平台。Bot 协议、Bot Runtime 消息路径、`POST /v1/bot/message`、streaming endpoint、CLI ephemeral 边界和插件 hook MVP 已落地。详见 [`docs/goals/archive/pivot-to-cognitive-bot-platform.md`](docs/goals/archive/pivot-to-cognitive-bot-platform.md)。

下一阶段目标：
- Adapter Contract — 抽出显式 Bot adapter 接口和 generic HTTP adapter 路由
- Demo Surface — 提供 `scripts/demo-bot-platform.ts` 作为最小非 CLI 演示入口，WebChat 页面保持可选
- Cognitive Trace — 稳定 Bot response trace 元数据，便于演示和调试
- Plugin Safety — 补强插件 capability、timeout、错误隔离和 trace
- Scope Hardening — 继续强化 platform / adapter / conversation / sender / session 隔离

后续执行路线见 [`docs/plans/2026-06-01-bot-platform-implementation-roadmap.md`](docs/plans/2026-06-01-bot-platform-implementation-roadmap.md)，当前 active OpenSpec change 是 `stabilize-bot-platform-mvp`。

### 待完善的认知能力

- 认知过程检查（Metacognition）：认知过程的监控和调整
- 规划与行动系统：多步骤计划、执行日志、失败恢复
- 世界模型：行动后果预测与风险推演
- 持续运行闭环：长期定期反思、目标维护和跨天连续性

## 文档

认知核心设计文档位于 `docs/conscious_agent_plan/`：

| 文档 | 内容 |
|------|------|
| [00_研究目标与边界](docs/conscious_agent_plan/00_研究目标与边界.md) | 项目定位、核心研究问题 |
| [01_总体架构设计](docs/conscious_agent_plan/01_总体架构设计.md) | 模块划分、交互流程 |
| [02_Cognitive_RAG](docs/conscious_agent_plan/02_Cognitive_RAG_认知记忆系统.md) | 认知记忆系统设计 |
| [09_数据模型](docs/conscious_agent_plan/09_数据模型与数据库设计.md) | 数据库表结构与向量索引 |
| [10_技术栈](docs/conscious_agent_plan/10_技术栈与工程结构.md) | 技术选型与工程目录 |
| [11_开发路线](docs/conscious_agent_plan/11_分阶段开发路线.md) | 开发计划 |
| [12_MVP任务清单](docs/conscious_agent_plan/12_MVP_开发任务清单.md) | Sprint 分解与验收标准 |

Bot 平台转型方向文档：[`docs/goals/archive/pivot-to-cognitive-bot-platform.md`](docs/goals/archive/pivot-to-cognitive-bot-platform.md)

Runtime 架构文档：[`docs/runtime-architecture.md`](docs/runtime-architecture.md)

## 项目原则

1. yunluostar 是多平台认知型 Bot 平台，不是 coding CLI
2. 认知核心（记忆、自我模型、用户模型、目标、反思）是产品差异化
3. 记忆必须影响行为，而不仅是影响回答
4. 自我模型是动态状态，不是 prompt 人设
5. 目标系统受安全边界约束
6. 每一次行动可追踪、可解释、可回滚
7. CLI 是 admin/debug/developer 工具，不是 Bot 平台主入口
8. CLI chat 默认 ephemeral，不写入任何长期认知状态（记忆、反思、自我模型、目标）
