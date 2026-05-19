# 12. MVP 开发任务清单

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

- [ ] 创建 TypeScript / Node.js 项目结构。
- [ ] 配置 CLI 入口。
- [ ] 配置 `npm run cli -- ...` 命令脚本。
- [ ] 配置 SQLite。
- [ ] 配置 Drizzle schema 与 migration。
- [ ] 配置 LLM client。
- [ ] 使用 Zod 创建基础配置校验。
- [ ] 配置 Vitest。
- [ ] 写 README。

## Sprint 2：数据库与记忆表

- [ ] 创建 episodes 表。
- [ ] 创建 semantic_memories 表。
- [ ] 创建 user_model 表。
- [ ] 创建 self_model 表。
- [ ] 创建 reflections 表。
- [ ] 创建 audit_logs 表。

## Sprint 3：情节记忆

- [ ] 实现 episode_recorder。
- [ ] 每轮对话后保存事件。
- [ ] 使用 LLM 抽取 user_intent、agent_action、outcome、lesson。
- [ ] 为 episode 生成 embedding。

## Sprint 4：语义记忆与用户模型

- [ ] 从 episode 中抽取 semantic memory。
- [ ] 从 episode 中抽取 user model update。
- [ ] 为记忆添加 confidence 和 evidence。
- [ ] 支持用户纠正后降低旧记忆权重。

## Sprint 5：记忆唤醒器

- [ ] 实现 embedding 相似度检索。
- [ ] 加入 importance 权重。
- [ ] 加入 recency 权重。
- [ ] 加入 goal relevance 权重。
- [ ] 返回本轮最相关记忆。

## Sprint 6：工作记忆

- [ ] 实现 WorkingMemory 类。
- [ ] 支持 current_goal。
- [ ] 支持 active_hypotheses。
- [ ] 支持 open_questions。
- [ ] 支持 risk_flags。
- [ ] 支持快照保存。

## Sprint 7：自我模型

- [ ] 初始化 Self Model。
- [ ] 实现 self_model_updater。
- [ ] 根据 reflection 生成更新候选。
- [ ] 给每次更新记录 evidence。
- [ ] 实现自我模型查看接口。

## Sprint 8：反思模块

- [ ] 实现 after_response_reflection。
- [ ] 输出 what_worked、what_failed、lessons。
- [ ] 输出 memory_update_candidates。
- [ ] 输出 self_update_candidates。
- [ ] 写入 reflections 表。

## Sprint 9：目标系统

- [ ] 创建 goals 表。
- [ ] 初始化核心目标。
- [ ] 根据用户长期研究方向生成长期目标。
- [ ] 实现 goal priority 排序。
- [ ] 实现目标冲突检查。

## Sprint 10：集成测试

- [ ] 测试 10 轮连续对话。
- [ ] 通过 CLI 运行 memory loop demo。
- [ ] 检查 Agent 是否记住长期目标。
- [ ] 检查 Agent 是否能引用过去讨论。
- [ ] 检查用户反馈是否改变回答策略。
- [ ] 检查错误记忆是否能被纠正。

## 第一版验收标准

- [ ] Agent 能保存情节记忆。
- [ ] Agent 能抽取语义记忆。
- [ ] Agent 能维护用户模型。
- [ ] Agent 能维护自我模型。
- [ ] Agent 能在回答前检索相关经历。
- [ ] Agent 能在回答后反思。
- [ ] Agent 的行为能被过去经历影响。
- [ ] CLI 能查看 memories、self model、goals 和 reflections。
