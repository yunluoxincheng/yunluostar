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
| CLI | Commander + Ink (React TUI) |
| 结构化存储 | SQLite |
| 向量检索 | sqlite-vec 优先，LanceDB / Chroma JS client 后续可选 |
| LLM | OpenAI / Claude / Qwen / Llama API |
| ORM / Query Builder | Drizzle ORM |
| 数据校验 | Zod |
| 测试 | Vitest |
| Web / API | Hono / Fastify / React / Vue，后续可选 |

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

```bash
# 直接运行 yunluo 进入交互式 shell
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

### CLI / Runtime 架构边界

当前架构已引入 runtime-backed 路径：

- CLI 保留 Commander 命令、Ink TUI、登录 UX、用户配置、工作区上下文收集、权限策略和流式显示。
- Runtime 拥有 agent controller、LLM provider 调用、embedding provider 调用、SQLite 记忆数据库、目标系统、工作记忆和反思流程。
- CLI 通过 `src/runtime-client/` 访问 runtime，不再在 chat/demo 路径中直接实例化 agent 或 provider。
- HTTP runtime 暴露 `POST /v1/chat` SSE 流、`GET /v1/runtime/status`、`GET /v1/memory`、`GET /v1/memory/:id`、`GET /v1/goals`、`POST /v1/goals/transition`、`GET /v1/self`、`GET /v1/reflections`、`GET /v1/session/:id`、`POST /v1/tools/result` 和 `POST /v1/auth/login`。
- hosted 模式下 CLI 不需要也不应持有 provider API key；embedding key 属于 runtime/server-side 配置。
- BYOK/local runtime 仍可通过用户显式配置让本地 runtime 读取 provider 环境变量或配置。
- CLI runtime token 存储在 `~/.yunluo/auth.json`，用户配置存储在 `~/.yunluo/config.json`。
- 权限策略存储在 config 中，写文件、shell、patch、edit 默认 ask；git status/diff 默认 allow；危险 shell 命令不会默认自动允许。CLI 工具桥可执行 read/write/search/shell/git diff/status/edit file，并通过 `POST /v1/tools/result` 回传结构化结果；TUI 中可用 `/approve <tool-id>` 或 `/deny <tool-id>` 处理待审批工具请求。
- Runtime 存储记录带有 `user_id` / `workspace_id` 作用域列；本地兼容默认用户是 `local-user`，workspace 来自 CLI 发送的 workspace context。启用 runtime auth 后，HTTP runtime 会把 bearer token 映射为 runtime user id，并用该 user id 隔离 session/memory/goal/reflection/audit 数据。

详细设计见 [`docs/runtime-architecture.md`](docs/runtime-architecture.md)。

### 运行测试

```bash
npm test
npm run test:coverage
```

## 项目状态

当前已完成 **阶段 1：Cognitive RAG — 结构化长期记忆**、**阶段 2：Working Memory — 当前状态维护**，以及 **阶段 4：Goal System — 目标管理** 的 MVP 能力。下一步建议进入 **Metacognition — 认知过程检查**。

已实现能力包括：

- CLI 对话命令（支持 `--message`、`--session`、`--json`）
- 默认交互式 shell 与项目风格化 TUI
- OpenAI-compatible provider 配置与 deterministic 本地模式
- 情节记忆录制与语义记忆提取
- 用户模型和自我模型的自动更新
- 后交互反思与记忆巩固
- 记忆唤醒（支持 embedding / sqlite-vec 语义检索与复合评分）
- 工作记忆快照（恢复、注入认知上下文、保存、只读查看）
- 修正处理（过期记忆降级与替代）
- **目标系统（Goal System）**：
  - 不可变核心目标（安全、诚实、可控性、用户对齐）自动初始化
  - 分层目标类型（core / long_term / medium_term / short_term / operational）
  - 建议目标从交互中推导，需用户审批才能激活
  - 操作级目标自动激活，无需审批
  - 目标优先级排序和当前目标选择
  - 重复检测（相同描述的目标不重复创建）
  - 冲突检测（与核心目标冲突、可变目标间矛盾检测）
  - CLI 目标管理命令（list / approve / reject / pause / complete）
  - 交互式 `/goals` 只读查看目标层级
  - 所有目标状态变更写入审计日志
  - 当前目标自动注入 Working Memory
- 审计日志追踪所有状态变更
- 只读检查命令（memory、wm、self、goals、reflections）

尚未完成的核心能力：

- 认知过程检查（Metacognition）：认知过程的监控和调整
- 规划与行动系统：多步骤计划、执行日志、失败恢复
- 世界模型：行动后果预测与风险推演
- 持续运行闭环：长期定期反思、目标维护和跨天连续性

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
