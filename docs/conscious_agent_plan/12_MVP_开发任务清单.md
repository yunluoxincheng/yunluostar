# 12. MVP 开发任务清单

状态更新时间：2026-06-01

> **状态说明：** 本文件保留早期认知核心 MVP 的完成状态，同时对齐当前 Bot 平台方向。历史上的 CLI-first 研究型 Agent 任务已经演进为 Bot Runtime MVP；CLI 现在只作为 admin/debug/developer 工具，CLI chat 默认 ephemeral，不写入 Bot 平台长期认知状态。

后续执行主线见：

- `docs/plans/2026-06-01-bot-platform-implementation-roadmap.md`
- `openspec/changes/stabilize-bot-platform-mvp/`

## 当前 MVP 目标

做一个可演示、可测试、可扩展的多平台认知型 Bot Runtime。

它应该能：

- 通过非 CLI Bot 入口接收消息。
- 将外部消息归一化为平台无关 Bot 协议。
- 按 platform / adapter / conversation / sender / session 隔离认知状态。
- 记录情节记忆并提取语义记忆。
- 维护用户模型、自我模型、工作记忆、目标和反思。
- 让记忆、目标和反思影响后续行为，而不仅仅写入数据库。
- 返回可观察 trace metadata，便于调试和演示。
- 允许插件通过 Runtime-controlled hooks 扩展行为，但不能绕过 scope、audit、permission 和 secret 边界。
- 保持 CLI 为 admin/debug/developer 工具，不成为主产品入口。

## 已完成：认知核心 MVP

### Sprint 1：项目初始化

- [x] 创建 TypeScript / Node.js 项目结构。
- [x] 配置 CLI 入口。
- [x] 配置 `npm run cli -- ...` 命令脚本。
- [x] 配置 SQLite。
- [x] 配置 Drizzle schema 与 migration。
- [x] 配置 LLM client。
- [x] 使用 Zod 创建基础配置校验。
- [x] 配置 Vitest。
- [x] 写 README。

### Sprint 2：数据库与记忆表

- [x] 创建 episodes 表。
- [x] 创建 semantic_memories 表。
- [x] 创建 user_model 表。
- [x] 创建 self_model 表。
- [x] 创建 reflections 表。
- [x] 创建 audit_logs 表。
- [x] 创建 working_memory_snapshots 表。
- [x] 创建 goals 表。
- [x] 为核心表加入 `user_id` / `workspace_id` scope。

### Sprint 3：情节记忆

- [x] 实现 episode recorder。
- [x] Bot 认知对话后保存 episode。
- [x] 使用 LLM / deterministic client 抽取 intent、action、outcome、lesson。
- [ ] 为 episode 生成 embedding。（当前实现中 episode 不直接参与语义检索，embedding 优先落在 semantic/user/self 状态上。）

### Sprint 4：语义记忆与用户模型

- [x] 从 episode 中抽取 semantic memory。
- [x] 从 episode 中抽取 user model update。
- [x] 为记忆添加 confidence 和 evidence。
- [x] 支持用户纠正后降低旧记忆权重或 supersede 旧状态。

### Sprint 5：记忆唤醒器

- [x] 实现 embedding 相似度检索。
- [x] 加入 importance 权重。
- [x] 加入 recency 权重。
- [x] 接入 sqlite-vec / embedding store / composite scorer。
- [ ] 加入 goal relevance 权重。（Goal System MVP 已存在，仍需将当前目标信号接入记忆评分。）
- [x] 返回本轮最相关记忆。

### Sprint 6：工作记忆

- [x] 实现 WorkingMemory 值对象。
- [x] 支持 current_goal。
- [x] 支持 current_context。
- [x] 支持 active_hypotheses。
- [x] 支持 open_questions。
- [x] 支持 risk_flags。
- [x] 支持快照保存和恢复。
- [x] 支持 CLI 只读查看。

### Sprint 7：自我模型

- [ ] 初始化核心 Self Model 种子。（当前支持从交互中生成 self_model entries，尚未建立固定核心自我边界种子。）
- [x] 实现 self_model update flow。
- [x] 根据 reflection 生成更新候选。
- [x] 给每次更新记录 evidence。
- [x] 实现自我模型查看接口。

### Sprint 8：反思模块

- [x] 实现 after-response reflection。
- [x] 输出 what_worked、what_failed、lessons。
- [x] 输出 memory_update_candidates。
- [x] 输出 self_update_candidates。
- [x] 写入 reflections 表。
- [ ] 增强 metacognition monitor：置信度、风险、目标一致性检查仍需深化。

### Sprint 9：目标系统

- [x] 创建 goals 表。
- [x] 实现 goal manager。
- [x] 实现目标类型：core、long_term、medium_term、short_term、operational。
- [x] 实现目标状态：suggested、active、paused、completed、rejected、deprecated。
- [x] 实现建议目标审批流。
- [x] 实现目标冲突检测。
- [x] 实现 CLI 管理命令。
- [ ] 初始化核心目标。
- [ ] 将 goal relevance 接入记忆唤醒。
- [ ] 增加更多行为级目标影响测试。

## 已完成：Bot Runtime MVP 基础

- [x] Runtime-backed 架构边界：CLI / Runtime / Protocol / Runtime-Client。
- [x] CLI 不直接 import agent/provider internals 的边界测试。
- [x] Bot protocol Zod schemas。
- [x] Bot scope helper：platform / adapter / conversation / sender / session。
- [x] `bot:` scope prefix 映射到 `userId` / `workspaceId`。
- [x] `POST /v1/bot/message` 非流式 Bot API。
- [x] `POST /v1/bot/message/stream` SSE Bot API。
- [x] Bot 消息进入认知流水线并产生 episode / reflection / memory / goal trace。
- [x] CLI chat ephemeral，不写入 Bot 长期认知状态。
- [x] 插件 manifest、registry、message hook MVP。
- [x] Bot 协议、Bot message path、HTTP endpoint、CLI/Bot isolation、plugin hook 测试。

## 当前 active MVP：stabilize-bot-platform-mvp

当前后续任务以 `openspec/changes/stabilize-bot-platform-mvp/tasks.md` 为准。

### 1. Adapter Contract

- [ ] 定义 Bot adapter interface。
- [ ] 增加 `src/adapters/generic-http/` schema 和 normalization helper。
- [ ] 增加 adapter boundary test，确保 adapter 不直接访问 DB、LLM、memory、reflection、goals 或 plugin internals。
- [ ] 增加 dedicated route：`POST /v1/adapters/generic-http/message`。
- [ ] 保留 `POST /v1/bot/message` 作为 already-normalized Bot request API。

### 2. Demo Surface

- [ ] 增加 `scripts/demo-bot-platform.ts` 作为最小非 CLI demo。
- [ ] demo 显示 assistant response、traceId、sessionId、episodeId、reflectionId、memoryIds、goalIds、pluginEvents。
- [ ] demo 展示不同 conversationId / senderUserId 的 identity isolation。
- [ ] WebChat 静态页面保持可选，不作为本 active MVP 的强制交付。

### 3. Cognitive Trace

- [ ] 稳定 Bot response trace metadata。
- [ ] 证明成功 Bot turn 返回 episodeId。
- [ ] 证明 reflection-enabled path 返回 reflectionId 或有明确 query path。
- [ ] 证明 recalled memory ids 和 selected/suggested goal ids 可观察。
- [ ] 确保 trace 不暴露 prompt、provider secret、auth token 或 raw internal records。

### 4. Plugin MVP Hardening

- [ ] 扩展 manifest 的可选 entry / config schema 支持。
- [ ] 增加 hook timeout。
- [ ] 增加 hook error isolation。
- [ ] 定义 capability vocabulary：`message.read`、`message.modify`、`memory.read`、`memory.write`、`goal.read`、`goal.suggest`、`tool.request`。
- [ ] 对任何 privileged PluginRuntimeContext API 执行 capability checks。
- [ ] 插件事件和失败进入 Bot response trace 或 stream events。

### 5. Scope Isolation

- [ ] 所有新增 Bot persistence/query scope 使用统一 Bot scope helper。
- [ ] 保持 `bot:` prefix 兼容。
- [ ] 增加 platform、adapter、conversation、sender user、session isolation 测试。
- [ ] 证明 custom sessionId 不能绕过 Bot-derived data scope。
- [ ] 继续验证 CLI chat 默认不写 Bot-scoped long-term memory、reflection、self model 或 goals。

### 6. Documentation and Verification

- [ ] 更新 README 和 runtime architecture docs。
- [ ] 增加本地 smoke test 命令。
- [ ] 增加 plugin safety 和 trace metadata 文档。
- [ ] 运行 `npm run lint`。
- [ ] 运行 `npm test`。
- [ ] 确认 demo script 可本地运行并显示 trace metadata。

## 第一版验收标准

- [x] Agent 能保存情节记忆。
- [x] Agent 能抽取语义记忆。
- [x] Agent 能维护用户模型。
- [x] Agent 能维护自我模型。
- [x] Agent 能在回答前检索相关经历。
- [x] Agent 能在回答后反思。
- [x] Agent 的行为能被过去经历影响。
- [x] Runtime 能通过 Bot API 处理非 CLI 消息。
- [x] CLI 能查看 memories、working memory、self model、goals 和 reflections。
- [x] CLI chat 默认 ephemeral。
- [ ] Bot Platform MVP 有显式 adapter contract。
- [ ] Bot Platform MVP 有非 CLI demo surface。
- [ ] Bot Platform MVP 有稳定 cognitive trace contract。
- [ ] Plugin MVP 有明确 safety boundary。
- [ ] Bot scope isolation 覆盖 platform / adapter / conversation / sender / session。
