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

运行 `yunluo` 不带子命令进入交互式 shell：

```
yunluo> 你好！
Agent: Response to: 你好！

yunluo> /help
Available commands:
  /help          Show this help message
  /exit, /quit   Exit the interactive shell
  /config        Display effective configuration (secrets redacted)
  /model         Display active provider and model info
  /session [id]  Show or switch the active session
  /memory        Show recent semantic memories (read-only)
  /wm            Show latest working memory snapshot (read-only)
  /self          Show active self model entries (read-only)
  /goals         Show active goals (read-only)
  /reflections   Show recent reflections (read-only)

yunluo> /exit
Goodbye!
```

### 配置

配置通过以下方式管理（按优先级从高到低）：

1. **CLI flags** — `--provider`, `--model`, `--base-url`, `--temperature`, `--timeout`, `--session`, `--db`
2. **环境变量** — `YUNLUO_PROVIDER`, `YUNLUO_BASE_URL`, `YUNLUO_API_KEY`, `YUNLUO_MODEL`, `YUNLUO_TEMPERATURE`, `YUNLUO_TIMEOUT`, `DATABASE_URL`, `LLM_PROVIDER`
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

### 运行测试

```bash
npm test
npm run test:coverage
```

## 项目状态

当前已完成 **阶段 1：Cognitive RAG — 结构化长期记忆**，并已落地 **阶段 2：Working Memory — 当前状态维护** 的 MVP 能力。下一步建议进入 **Goal System — 长期目标管理**。

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
- 审计日志追踪所有状态变更
- 只读检查命令（memory、wm、self、goals、reflections）

尚未完成的核心能力：

- 目标系统：目标分层、优先级、建议目标、审批与冲突检测
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
