# 03. Working Memory：工作记忆

## 1. 定义

工作记忆是 Agent 当前正在处理的信息状态，相当于“当前意识窗口”。

它回答：

- 我现在的目标是什么？
- 我当前知道哪些上下文？
- 我正在考虑哪些假设？
- 我有哪些未解决问题？
- 当前风险是什么？
- 当前计划执行到哪一步？

## 2. 数据结构示例

```json
{
  "session_id": "s_001",
  "current_goal": "设计主体型 Agent 的开发路线",
  "current_context": "用户正在从理论讨论转向工程实现",
  "active_hypotheses": [
    "主体型 Agent 需要从 Cognitive RAG 开始",
    "下一阶段应建立工作记忆和自我模型"
  ],
  "open_questions": [
    "MVP 应先做哪些模块？",
    "如何评估 Agent 是否具备连续性？"
  ],
  "attention_focus": [
    "开发规划",
    "模块拆分",
    "数据库设计"
  ],
  "risk_flags": [
    "不要宣称主观意识已被实现",
    "目标系统必须受安全边界限制"
  ],
  "plan_state": {
    "phase": "architecture_planning",
    "completed_steps": ["Cognitive RAG design"],
    "next_steps": ["Working Memory", "Self Model"]
  }
}
```

## 3. 工作记忆与上下文窗口的区别

| 上下文窗口 | 工作记忆 |
|---|---|
| 临时 token 序列 | 结构化状态 |
| 被动塞给模型 | 主动维护和更新 |
| 容易被长文本淹没 | 明确区分目标、假设、风险 |
| 会随对话结束消失 | 可以被保存和恢复 |

## 4. 更新时机

- 用户输入后更新。
- 检索记忆后更新。
- 目标系统选择目标后更新。
- 规划器生成计划后更新。
- 工具执行后更新。
- 反思模块结束后清理或归档。

## 5. MVP 开发任务

- 定义 WorkingMemory 数据类。
- 支持 create / update / snapshot / restore。
- 每轮对话开始时加载上一轮重要状态。
- 每轮回答前把工作记忆转成 prompt context。
- 每轮结束后保存工作记忆快照。
