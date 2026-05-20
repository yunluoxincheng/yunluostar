# 12. MVP 开发任务清单

状态更新时间：2026-05-21

说明：本清单按当前代码实现状态对齐。阶段 1（Cognitive RAG）和阶段 2（Working Memory）的 MVP 能力已基本落地；目标系统仍处于下一阶段设计/提案阶段。

## MVP 目标

做一个“会成长的研究型 Agent”。

它应该能：

- 记住每次讨论的核心内容。
- 抽取用户长期研究目标。
- 维护自己的回答策略。
- 根据过去反馈调整回答。
- 发现前后观点冲突。
- 每次对话后生成反思。
- 下次对话时使用过去经验。

## Sprint 1：项目初始化

- [x] 创建 TypeScript / Node.js 项目结构。
- [x] 配置 CLI 入口。
- [x] 配置 `npm run cli -- ...` 命令脚本。
- [x] 配置 SQLite。
- [x] 配置 Drizzle schema 与 migration。
- [x] 配置 LLM client。
- [x] 使用 Zod 创建基础配置校验。
- [x] 配置 Vitest。
- [x] 写 README。

## Sprint 2：数据库与记忆表

- [x] 创建 episodes 表。
- [x] 创建 semantic_memories 表。
- [x] 创建 user_model 表。
- [x] 创建 self_model 表。
- [x] 创建 reflections 表。
- [x] 创建 audit_logs 表。

## Sprint 3：情节记忆

- [x] 实现 episode_recorder。
- [x] 每轮对话后保存事件。
- [x] 使用 LLM 抽取 user_intent、agent_action、outcome、lesson。
- [ ] 为 episode 生成 embedding。（当前实现中 episode 不参与语义检索，embedding 优先落在 semantic/user/self 状态上。）

## Sprint 4：语义记忆与用户模型

- [x] 从 episode 中抽取 semantic memory。
- [x] 从 episode 中抽取 user model update。
- [x] 为记忆添加 confidence 和 evidence。
- [x] 支持用户纠正后降低旧记忆权重。

## Sprint 5：记忆唤醒器

- [x] 实现 embedding 相似度检索。
- [x] 加入 importance 权重。
- [x] 加入 recency 权重。
- [ ] 加入 goal relevance 权重。（等待 Goal System 提供当前目标与目标相关性信号。）
- [x] 返回本轮最相关记忆。

## Sprint 6：工作记忆

- [x] 实现 WorkingMemory 类。
- [x] 支持 current_goal。
- [x] 支持 active_hypotheses。
- [x] 支持 open_questions。
- [x] 支持 risk_flags。
- [x] 支持快照保存。

## Sprint 7：自我模型

- [ ] 初始化 Self Model。（当前支持从交互中生成 self_model entries，尚未建立固定核心自我边界种子。）
- [x] 实现 self_model_updater。
- [x] 根据 reflection 生成更新候选。
- [x] 给每次更新记录 evidence。
- [x] 实现自我模型查看接口。

## Sprint 8：反思模块

- [x] 实现 after_response_reflection。
- [x] 输出 what_worked、what_failed、lessons。
- [x] 输出 memory_update_candidates。
- [x] 输出 self_update_candidates。
- [x] 写入 reflections 表。

## Sprint 9：目标系统

- [x] 创建 goals 表。
- [ ] 初始化核心目标。
- [ ] 根据用户长期研究方向生成长期目标。
- [ ] 实现 goal priority 排序。
- [ ] 实现目标冲突检查。

## Sprint 10：集成测试

- [ ] 测试 10 轮连续对话。
- [x] 通过 CLI 运行 memory loop demo。
- [ ] 检查 Agent 是否记住长期目标。（等待 Goal System。）
- [x] 检查 Agent 是否能引用过去讨论。
- [x] 检查用户反馈是否改变回答策略。
- [x] 检查错误记忆是否能被纠正。

## 第一版验收标准

- [x] Agent 能保存情节记忆。
- [x] Agent 能抽取语义记忆。
- [x] Agent 能维护用户模型。
- [x] Agent 能维护自我模型。
- [x] Agent 能在回答前检索相关经历。
- [x] Agent 能在回答后反思。
- [x] Agent 的行为能被过去经历影响。
- [x] CLI 能查看 memories、working memory、self model、goals 和 reflections。
