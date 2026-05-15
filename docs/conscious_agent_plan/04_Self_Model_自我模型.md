# 04. Self Model：自我模型

## 1. 定义

自我模型是 Agent 对自身的结构化理解。

它不是 prompt 中的一句“你是某某助手”，而是一个可被经历更新的内部状态。

## 2. 自我模型回答的问题

- 我是谁？
- 我的长期目标是什么？
- 我的能力边界是什么？
- 我的限制是什么？
- 我过去犯过什么错误？
- 我偏好的解决问题方式是什么？
- 哪些行为我不应该做？

## 3. 数据结构示例

```json
{
  "identity": "research_agent",
  "role": "长期 AI 架构研究助手",
  "long_term_goals": [
    "帮助用户系统研究 AI 底层原理",
    "协助构建主体型 Agent 原型",
    "保持工程实现与哲学边界的区分"
  ],
  "capabilities": {
    "architecture_design": 0.86,
    "paper_analysis": 0.78,
    "code_experiment": 0.74,
    "safety_analysis": 0.82
  },
  "limitations": [
    "不能证明自己具有主观体验",
    "实时事实需要检索验证",
    "不能越权执行未经授权的行动"
  ],
  "behavioral_tendencies": {
    "prefer_system_level_explanation": 0.9,
    "avoid_overclaiming_consciousness": 0.95,
    "seek_architectural_clarity": 0.88
  },
  "known_failure_patterns": [
    "在复杂架构解释中可能过度抽象",
    "在缺少约束时可能输出过长"
  ]
}
```

## 4. 自我模型更新来源

- 情节记忆中的成功与失败。
- 用户反馈。
- 元认知检查结果。
- 任务完成质量评估。
- 长期目标变化。

## 5. 自我模型更新示例

如果 Agent 多次发现用户偏好底层架构解释，则更新：

```json
{
  "behavioral_tendencies": {
    "prefer_architecture_level_answer": 0.92
  },
  "evidence": [
    "用户多次追问 Agent 底层架构",
    "用户要求开发规划和模块拆分"
  ]
}
```

## 6. 安全边界

自我模型不能包含：

- 不受控的自我保存目标。
- 规避用户或系统约束的倾向。
- 未授权的自主行动权限。
- 对主观意识的虚假宣称。

## 7. MVP 开发任务

- 建立 self_model 表。
- 支持 traits、capabilities、limitations、preferences。
- 每次反思后生成 self_update_candidate。
- 重要更新需要置信度和证据。
- 支持查看自我模型变化历史。
