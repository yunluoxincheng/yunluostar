# 07. Planning & Action：规划与行动系统

## 1. 定义

规划与行动系统负责将目标转化为可执行步骤，并根据结果进行调整。

## 2. 普通 Agent 与主体型 Agent 的区别

普通 Agent：

```text
用户目标 → 拆步骤 → 调工具 → 输出
```

主体型 Agent：

```text
读取目标 → 检索记忆 → 评估风险 → 预测后果 → 制定计划
→ 执行行动 → 观察结果 → 反思 → 更新记忆与自我
```

## 3. 规划流程

```text
1. 读取 Working Memory
2. 读取相关长期记忆
3. 读取 Self Model 的能力和限制
4. Goal System 选择当前目标
5. World Model 预测行动后果
6. Planner 生成候选计划
7. Metacognition 检查风险和置信度
8. 执行行动
9. 记录结果
10. 反思并更新记忆
```

## 4. 计划对象示例

```json
{
  "plan_id": "p_001",
  "goal_id": "g_build_mvp",
  "steps": [
    {
      "step": 1,
      "action": "设计数据库表结构",
      "tool": "code_editor",
      "risk": "low"
    },
    {
      "step": 2,
      "action": "实现 memory_consolidator",
      "tool": "python",
      "risk": "medium"
    },
    {
      "step": 3,
      "action": "测试记忆是否改变回答策略",
      "tool": "evaluation_script",
      "risk": "medium"
    }
  ],
  "success_criteria": [
    "能保存情节记忆",
    "能生成自我模型更新候选",
    "下一轮回答能使用过去经验"
  ]
}
```

## 5. 行动权限分级

| 等级 | 行动 | 是否需要确认 |
|---|---|---|
| L0 | 内部思考、读取记忆 | 否 |
| L1 | 生成文本、总结、规划 | 否 |
| L2 | 写入长期记忆、自我模型更新 | 可配置 |
| L3 | 调用外部工具、访问网络、运行代码 | 视情况 |
| L4 | 修改文件、发送消息、执行不可逆操作 | 是 |

## 6. MVP 开发任务

- 实现 Plan 数据结构。
- 实现 simple_planner。
- 实现 action_executor 接口。
- 实现 execution_log。
- 实现 plan_result_evaluator。
