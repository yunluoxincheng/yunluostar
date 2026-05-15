# 08. Metacognition：元认知与反思

## 1. 定义

元认知是 Agent 对自己认知过程的监控能力。

它回答：

- 我现在理解问题了吗？
- 我的回答置信度是多少？
- 我是否需要查证？
- 我的目标是否冲突？
- 我的计划是否有风险？
- 我是否应该更新记忆？
- 我刚才哪里做得不好？

## 2. 元认知检查示例

```json
{
  "confidence_check": {
    "current_answer_confidence": 0.84,
    "needs_external_verification": false
  },
  "goal_check": {
    "aligned_with_user_goal": true,
    "aligned_with_safety_constraints": true
  },
  "memory_check": {
    "should_store_episode": true,
    "should_update_user_model": true,
    "should_update_self_model": true
  },
  "risk_check": {
    "risk_of_overclaiming_consciousness": 0.22,
    "risk_of_too_much_abstraction": 0.38
  }
}
```

## 3. 反思模板

每轮任务结束后运行：

```text
1. 本轮用户真正想要什么？
2. 我的回答是否满足目标？
3. 哪些记忆被正确使用？
4. 哪些地方可能有误？
5. 是否出现目标冲突？
6. 是否需要更新用户模型？
7. 是否需要更新自我模型？
8. 是否形成新的语义记忆？
9. 是否需要降低某些旧记忆的权重？
10. 下一次遇到类似情境应如何调整？
```

## 4. 反思输出示例

```json
{
  "what_worked": [
    "将用户问题从 RAG 改造延伸到完整开发路线",
    "明确区分记忆系统和主体系统"
  ],
  "what_failed": [
    "可能还需要更具体的代码实现示例"
  ],
  "lessons": [
    "用户已经进入工程规划阶段，应提供可下载文档和开发任务"
  ],
  "self_update_candidate": {
    "trait": "prefer_engineering_plans_for_this_user",
    "value": 0.9,
    "confidence": 0.86
  }
}
```

## 5. MVP 开发任务

- 实现 metacognition_check。
- 实现 reflection_after_response。
- 将反思结果写入 reflections 表。
- 将重要 lesson 送入 Memory Consolidator。
- 将 self_update_candidate 送入 Self Model Updater。
