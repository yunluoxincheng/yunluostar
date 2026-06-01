# yunluostar Bot Platform 实现路线图

状态日期：2026-06-01

本文基于当前代码、README、`docs/runtime-architecture.md`、`docs/goals/archive/pivot-to-cognitive-bot-platform.md`、OpenSpec specs 和现有测试状态撰写，用于指导 yunluostar 从当前 Bot Runtime MVP 继续演进为可演示、可扩展、可验证的多平台认知型 Agentic Bot 平台。

## 1. 当前项目状态

### 1.1 已完成的基础

当前项目已经完成从 CLI-first agent 原型到 Bot Runtime 的关键转向：

- 项目定位已明确为多平台认知型 Agentic Bot 平台。
- CLI 已重新定位为 admin/debug/developer 工具。
- CLI chat 默认 ephemeral，不写入 Bot 平台长期认知状态。
- `src/runtime/`、`src/runtime-client/`、`src/protocol/` 的 Runtime-backed 边界已经建立。
- `src/bot/` 中已经有平台无关 Bot 协议和 Bot scope 映射。
- `POST /v1/bot/message` 和 `POST /v1/bot/message/stream` 已实现。
- Bot 消息已经能进入现有认知流水线。
- 数据库核心表已经支持 `user_id` / `workspace_id` scope。
- 情节记忆、语义记忆、用户模型、自我模型、工作记忆、目标、反思、审计日志已经有 MVP 实现。
- sqlite-vec / embedding-backed retrieval 已接入记忆唤醒。
- 插件 manifest、registry、message hook 已有 MVP 骨架。
- CLI/Bot 记忆隔离已有测试覆盖。

### 1.2 当前验证状态

截至本路线图撰写时，项目已通过：

```powershell
npm run lint
npm test
```

测试结果：

- 33 个测试文件通过。
- 296 个测试通过。

### 1.3 当前主要不足

当前项目更准确地说是“Bot Runtime MVP”，还不是完整 Bot 平台：

- 适配器层尚未独立成清晰目录和接口，`/v1/bot/message` 目前更像 Runtime API，而不是完整 adapter contract。
- 还没有最小非 CLI demo surface；当前 active OpenSpec 将必做项定义为 `scripts/demo-bot-platform.ts`，轻量 WebChat 页面为可选项。
- 插件系统还没有 entry、config schema、capability enforcement、timeout、command routing 等安全边界。
- Bot scope 目前复用 `userId/workspaceId/sessionId`，短期可用，但长期需要显式 Bot scope 查询和可能的 schema 演进。
- 认知能力已经能写入和唤醒，但仍需要更多行为级验收，证明记忆、反思和目标确实改变后续行为。
- 生产级 webhook auth、adapter token、dashboard、插件市场、IM 平台适配器都还未进入实现阶段。

## 2. 产品主线

### 2.1 一句话定位

yunluostar 是一个多平台认知型 Agentic Bot 平台，核心价值是让 Bot 在长期交互中形成可追踪、可解释、可回滚、可影响未来行为的认知状态。

### 2.2 主线目标

下一阶段主线不是扩展 CLI，也不是立刻接复杂 IM 平台，而是打穿以下闭环：

```text
非 CLI Bot 输入
  -> Adapter 归一化
  -> Bot Protocol / Scope
  -> Bot Runtime
  -> 认知流水线
  -> 可观察 trace
  -> 长期认知状态更新
  -> 后续行为改变
```

### 2.3 非目标

在 Bot Platform MVP 稳定前，暂不推进：

- 完整 Web Dashboard。
- 插件市场。
- SaaS billing / quota。
- 多节点生产部署。
- Docker/Kubernetes 生产方案。
- QQ、微信、Telegram、Discord、Slack、飞书、钉钉、企业微信等真实 IM 适配器。
- 独立 coding agent 产品。
- CLI 长期记忆 UX 扩展。
- 大规模依赖升级或框架重写。

## 3. 路线图总览

建议使用 8 个阶段推进：

| 阶段 | 名称 | 核心结果 |
|---|---|---|
| Phase 0 | 路线锁定与计划管理 | 维护现有 OpenSpec change 和验收清单 |
| Phase 1 | Adapter Contract | 抽出 adapter 接口和 generic HTTP adapter |
| Phase 2 | Demo Surface | 提供最小非 CLI Bot 演示入口，WebChat 页面可选 |
| Phase 3 | Cognitive Trace | 让认知过程可观察、可调试、可演示 |
| Phase 4 | Plugin Safety MVP | 完成插件安全边界和 command routing |
| Phase 5 | Scope & Storage Hardening | 强化 Bot scope 查询、隔离和未来 schema 演进路径 |
| Phase 6 | Cognitive Behavior Evaluation | 用行为测试证明记忆、反思、目标会影响未来行为 |
| Phase 7 | Operational Readiness | 增强认证、错误处理、demo 脚本、文档和发布准备 |

## 4. Phase 0：路线锁定与计划管理

目标：把本路线图和现有 OpenSpec change 保持一致，防止后续开发偏离主线。

### 4.1 任务

- 维护当前 active OpenSpec change：`stabilize-bot-platform-mvp`。
- 在 proposal 中持续明确当前阶段目标：稳定 Bot Platform MVP，而不是新增复杂 IM 平台。
- 在 design 中保持 adapter contract、trace 模型、plugin 安全边界、scope 演进策略与实现同步。
- 在 tasks 中持续拆分和更新本路线图的阶段任务。
- 标记 CLI 的边界：只做 admin/debug/inspection，不做主要长期记忆入口。
- 建立“不做事项”清单，防止范围膨胀。

### 4.2 验收标准

- OpenSpec change `stabilize-bot-platform-mvp` 存在并通过 `openspec validate`。
- proposal/design/tasks 与本文路线一致。
- 每个阶段都有可检查任务和完成条件。

### 4.3 风险

- 如果不建立 change，后续容易同时推进 WebChat、IM、插件、dashboard、认知研究，导致主线失焦。

## 5. Phase 1：Adapter Contract

目标：把目前的 Bot API 推进为真正的 adapter 架构。

### 5.1 设计原则

Adapter 只做平台归一化，不拥有认知状态，不直接访问数据库，不绕过 Runtime。

```text
External Payload
  -> Adapter Schema Validation
  -> BotMessageRequest
  -> Runtime.handleBotMessage()
  -> External Response Mapping
```

### 5.2 建议目录

```text
src/adapters/
  generic-http/
    adapter.ts
    schema.ts
    README.md
  types.ts
```

### 5.3 任务

- 定义 `BotAdapter` 接口：
  - `id`
  - `platformId`
  - `normalize(input)`
  - `formatResponse(response)`
  - 可选 `verify(request)`，为后续签名认证预留。
- 实现 generic HTTP adapter。
- 将 `POST /v1/bot/message` 的请求处理逻辑收敛到 adapter 或明确标注为 WebChat/generic runtime API。
- 为 invalid payload 返回稳定错误结构，而不是只返回 Zod message。
- 增加 adapter-level tests：
  - valid generic payload -> BotMessageRequest。
  - missing required fields -> field-level error。
  - unsupported adapter payload -> clear error。

### 5.4 验收标准

- generic HTTP payload 可以通过 adapter 归一化进入 Runtime。
- Runtime 不知道外部平台 payload 的细节。
- 新 adapter 可按同一接口添加。
- 测试覆盖成功、失败和错误结构。

## 6. Phase 2：Demo Surface

目标：提供一个最小可用的非 CLI 产品表面，让 Bot Runtime 不只停留在 curl/API 层。

### 6.1 范围

不做完整 dashboard。当前 active OpenSpec 的必做 demo surface 是 `scripts/demo-bot-platform.ts`；轻量 WebChat 页面可以做，但保持可选。

### 6.2 建议能力

- 通过 generic HTTP adapter route 发送 Bot 消息。
- 展示 assistant response。
- 展示 `traceId`、`sessionId`、`episodeId`、`reflectionId`。
- 展示 recalled memory ids、goal ids、plugin events。
- 支持设置：
  - `platformId`
  - `adapterId`
  - `conversationId`
  - `senderUserId`
- 支持或文档化两组 conversation/user 示例，以演示 scope 隔离。

### 6.3 建议目录

必做脚本：

```text
scripts/
  demo-bot-platform.ts
```

可选轻量 WebChat 页面：

```text
src/webchat/
  server-route.ts
  static/
    index.html
    app.js
    styles.css
```

也可以先放在：

```text
docs/demos/webchat/
```

第一阶段不必引入大型前端框架。

### 6.4 验收标准

- 用户能通过非 CLI demo script 完成一轮 Bot 对话。
- demo 能展示认知 trace 的关键 id。
- 切换 conversation 后，记忆/工作记忆不会串线。
- 有手动 smoke test 文档。

## 7. Phase 3：Cognitive Trace

目标：把“认知型 Bot”的内部过程变成可观察、可调试、可演示的产品能力。

### 7.1 当前问题

现在 Bot response 已返回 `traceId`、`episodeId`、`reflectionId`、`memoryIds`、`goalIds`，但 trace 还偏轻量。后续需要能回答：

- 本轮唤醒了哪些记忆？
- 为什么这些记忆相关？
- 当前 working memory 是什么？
- 当前目标如何影响了回答？
- 反思产生了哪些更新候选？
- 哪些 semantic memory / user model / self model 被新建或 supersede？

### 7.2 建议能力

- 扩展 Bot response 或增加 trace query API：
  - `GET /v1/traces/:traceId`
  - 或 `GET /v1/bot/traces/:traceId`
- trace 中包含：
  - stages
  - recalled memories
  - applied user model entries
  - applied self model entries
  - selected goal
  - suggested goals
  - reflection summary
  - consolidation outputs
  - plugin traces
  - warnings/errors
- trace 中不包含 provider secrets、raw auth token、敏感 plugin config。

### 7.3 验收标准

- 每次 Bot 对话可以根据 `traceId` 查询关键认知过程。
- trace 可用于 demo script 展示，并可被未来 WebChat demo 复用。
- trace 不泄漏 secret。
- trace 不需要读取全库才能拼装。

## 8. Phase 4：Plugin Safety MVP

目标：让插件系统从“hook 骨架”升级为“可控扩展机制”。

### 8.1 设计原则

插件可以扩展 Bot 行为，但不能绕过 Runtime 的 scope、audit、permission、memory 和 secret 边界。

### 8.2 任务

- 扩展 plugin manifest：
  - `id`
  - `name`
  - `version`
  - `description`
  - `entry`
  - `capabilities`
  - `configSchema`
- 增加 plugin config 读取接口，并统一走 redaction。
- 实现 hook timeout，避免插件阻塞核心响应。
- 实现 capability enforcement：
  - `message.read`
  - `message.modify`
  - `memory.read`
  - `memory.write`
  - `goal.read`
  - `goal.suggest`
  - `tool.request`
- 接入 command routing：
  - 例如 `/plugin-command arg1 arg2`
  - 命令执行仍走 Runtime scope 和 audit。
- 插件错误写入 trace，但默认不打断核心 Bot 响应。
- 增加测试：
  - 无 capability 时拒绝敏感访问。
  - hook timeout 被记录。
  - hook error 被隔离。
  - command handler 可运行并产生 trace。

### 8.3 验收标准

- 至少一个测试插件可以注册、运行 hook、执行 command。
- 插件无法读取 secret。
- 插件无法绕过 scope 直接写 memory/goal。
- 插件失败不会导致正常 Bot 响应失败，除非插件被显式配置为 required。

## 9. Phase 5：Scope & Storage Hardening

目标：在不破坏当前 MVP 的基础上，强化 Bot scope 的长期可维护性。

### 9.1 当前策略

当前 Bot scope 映射为：

```text
userId      = bot:{platformId}:{senderUserId}
workspaceId = bot:{platformId}:{adapterId}:{conversationId}
sessionId   = bot:{platformId}:{adapterId}:{conversationId}:{senderUserId}
```

这个方案适合 MVP，但长期会遇到查询和审计问题。

### 9.2 短期任务

- 将所有 Bot scope 字符串拼接集中在 `src/bot/scope.ts`，禁止散落到其他模块。
- 增加 scope parser：
  - 从 `bot:` prefixed `userId/workspaceId/sessionId` 反解 platform、adapter、conversation、sender。
- 增加测试覆盖：
  - same user different conversations。
  - same conversation different users。
  - same user different platforms。
  - custom sessionId 不破坏 isolation。
- 为 Runtime list APIs 增加 Bot scope 查询 helper。

### 9.3 中期任务

评估是否新增显式 Bot scope 字段：

```text
platform_id
adapter_id
conversation_id
sender_user_id
bot_session_id
```

建议先写 migration design，不急于执行大迁移。

### 9.4 验收标准

- 所有 Bot scope 查询都有统一 helper。
- 没有新增散落字符串拼接。
- 不同平台/用户/会话的长期记忆和工作记忆不会串线。
- 已形成显式 Bot scope schema migration 的设计文档。

## 10. Phase 6：Cognitive Behavior Evaluation

目标：证明 yunluostar 的“认知”不是只写数据库，而是真的影响行为。

### 10.1 行为验收场景

#### 偏好记忆

用户在 Bot scope A 中说：

```text
以后回答我时尽量简短。
```

后续同 scope 对话应体现更简短的回答策略。

#### 用户纠错

用户说：

```text
我不是做游戏开发的，我主要做 Bot 平台。
```

系统应 supersede 旧 user model，新 user model 后续生效。

#### 目标影响

当 active goal 是：

```text
稳定 Bot Runtime MVP。
```

系统回答应优先围绕 Runtime、adapter、scope、trace，而不是发散到 CLI coding agent。

#### 反思影响

如果某轮回答失败或低置信度，reflection 应产生风险/改进信号，并能影响后续回答策略。

#### Scope 隔离

同一个 sender 在不同 conversation 中产生的 conversation-specific memory 不应互相污染。

### 10.2 任务

- 增加 deterministic behavior evaluation tests。
- 引入固定测试 prompt 和固定 deterministic LLM 输出。
- 对 memory awakening、context building、goal selection、reflection update 做端到端断言。
- 增加 10 轮连续 Bot 对话测试，替代早期 CLI 连续对话验收。

### 10.3 验收标准

- 至少 5 类认知行为验收测试通过。
- 能用测试证明记忆、目标、纠错、反思对未来响应有影响。
- 测试不依赖真实 provider API key。

## 11. Phase 7：Operational Readiness

目标：把 MVP 从“能跑”推进到“能演示、能调试、能安全自托管”。

### 11.1 任务

- 增强 webhook/auth 设计：
  - runtime token
  - adapter token
  - shared secret
  - future signed request placeholder
- 改善 error response：
  - validation error
  - provider unavailable
  - embedding unavailable
  - plugin failure
  - database write failure
  - streaming failure
- 增加 demo scripts：
  - start runtime
  - send bot message
  - stream bot message
  - inspect memory
  - inspect reflection
  - inspect trace
- 更新 README quickstart，使用户优先体验 Bot API / generic HTTP adapter demo，而不是 CLI chat。
- 增加 docs：
  - adapter development guide
  - plugin development guide
  - Bot scope guide
  - self-hosting local runtime guide
- 明确 Vercel `api/embed.ts` 在整体架构中的角色，避免它看起来像主 Runtime。

### 11.2 验收标准

- 新用户可以按 README 在 10 分钟内启动 Runtime 并发送 Bot 消息。
- demo 能展示 response、trace、memory/reflection 写入。
- 常见错误有稳定 JSON 结构。
- 文档明确生产部署仍未完成，避免误导。

## 12. 推荐执行顺序

严格建议按以下顺序推进：

```text
Phase 0 -> Phase 1 -> Phase 2 -> Phase 3 -> Phase 4 -> Phase 5 -> Phase 6 -> Phase 7
```

不要提前做真实 IM adapter。真实 IM 适配器应在 Phase 1-3 稳定后作为下一条路线进入：

```text
Telegram/Discord/Slack/QQ/Feishu Adapter
  -> adapter-specific auth
  -> message format normalization
  -> media/event support
  -> rate limit
  -> deployment guide
```

## 13. 每阶段通用完成标准

每个阶段完成时必须满足：

- 有对应 OpenSpec task 状态更新。
- 有单元测试或集成测试覆盖关键行为。
- 运行：

```powershell
npm run lint
npm test
```

- 文档更新与实现一致。
- 没有把 CLI 扩展为主产品入口。
- 没有引入真实 secret。
- 没有破坏现有 Runtime-backed 边界。

## 14. 风险清单

### 14.1 产品风险

- 范围过大：认知核心、Bot 平台、插件、dashboard、IM、coding agent 同时推进。
- 差异化模糊：如果记忆不影响行为，项目会退化成普通 Bot 平台。
- CLI 路线回潮：继续强化 CLI chat 会稀释 Bot 平台定位。

### 14.2 架构风险

- Adapter 逻辑直接进入 Runtime，导致未来每接一个平台都污染核心。
- Plugin capability 只声明不执行，形成安全假象。
- Scope 继续依赖字符串约定但缺少 parser/helper，后期查询和迁移困难。
- Trace 信息分散在多个表里，难以为 WebChat/dashboard 复用。

### 14.3 数据风险

- 用户模型、记忆、目标跨平台或跨 conversation 泄漏。
- 旧记忆 supersede 逻辑不足，导致纠错后仍唤醒错误记忆。
- 自我模型缺少核心边界种子，容易被交互噪声污染。

### 14.4 安全风险

- Webhook endpoint 在公开部署时缺少认证。
- Plugin 读取敏感配置。
- Runtime/admin API 暴露 provider secret 或 token。
- Local tool bridge 被错误用于 Bot 公共入口。

## 15. 后续大路线

当本文 8 个阶段完成后，再进入下一批路线。

### 15.1 IM Adapter 路线

候选顺序：

1. Telegram 或 Discord：协议清晰、开发体验好。
2. Slack/Feishu/DingTalk：企业场景更强。
3. QQ/WeChat/WeCom：用户价值高，但接入和风控复杂，后置。

### 15.2 Dashboard 路线

Dashboard 第一版只做 admin console：

- adapters status
- runtime status
- provider readiness
- memory inspector
- goals/reflections inspector
- plugin registry
- audit logs
- trace viewer

### 15.3 Cognitive Core 深化路线

- 初始化核心 self model。
- 强化 goal relevance scoring。
- 增加 metacognition monitor。
- 增加 planner/action executor。
- 增加 world model / risk prediction。
- 增加 scheduled reflection 和长期目标维护。

### 15.4 Production 路线

- Docker packaging。
- Hosted runtime config。
- PostgreSQL/storage adapter 评估。
- Qdrant/vector backend 评估。
- Adapter token management。
- Deployment guide。
- Backup/export/delete data policy。

## 16. 总结

后续实现应围绕一个判断标准展开：

```text
这个改动是否增强了 Bot Runtime 的认知连续性、平台扩展性或可观察性？
```

如果答案是否定的，就应延后。

当前 yunluostar 的重点不是重写，而是收束和打穿：

- 把 Bot API 收束成 adapter 架构。
- 用非 CLI demo surface 呈现产品表面，WebChat 页面保持可选。
- 用 cognitive trace 呈现认知差异化。
- 用 plugin safety 证明扩展边界。
- 用行为测试证明记忆、目标、反思真的影响未来行为。

完成这些后，yunluostar 才适合进入 IM adapter、dashboard、插件生态和生产部署阶段。
