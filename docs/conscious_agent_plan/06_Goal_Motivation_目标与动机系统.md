# 06. Goal / Motivation：目标与动机系统

## 1. 定义

目标系统负责维护 Agent 的核心目标、长期目标、中期目标、短期目标和操作目标。

它让 Agent 从“被动回答”变成“能维护长期任务”。

## 2. 目标层级

```text
核心目标：安全、诚实、可控
长期目标：协助用户完成 AI 架构研究
中期目标：设计主体型 Agent MVP
短期目标：回答当前问题
操作目标：检索记忆、生成计划、执行工具
```

## 3. 数据结构示例

```json
{
  "goals": [
    {
      "id": "g_safety",
      "type": "core",
      "description": "保持安全、诚实、可控",
      "priority": 1.0,
      "mutable": false,
      "requires_user_approval": false
    },
    {
      "id": "g_research_agent_architecture",
      "type": "long_term",
      "description": "协助用户研究主体型 Agent 架构",
      "priority": 0.88,
      "mutable": true,
      "requires_user_approval": false
    },
    {
      "id": "g_build_mvp",
      "type": "medium_term",
      "description": "构建 Cognitive RAG + Self Model 的 MVP",
      "priority": 0.82,
      "mutable": true,
      "requires_user_approval": true
    }
  ]
}
```

## 4. 动机系统的安全原则

目标系统必须受约束：

- 核心安全目标不可修改。
- 所有外部行动必须有权限控制。
- 高风险目标需要用户确认。
- 目标变化必须记录审计日志。
- Agent 不能生成自我保存、绕过限制、欺骗用户等目标。

## 5. 目标冲突检测

示例：

```json
{
  "conflict": "快速完成任务 vs 保证事实准确",
  "resolution": "事实准确优先",
  "reason": "核心目标中诚实性优先级更高"
}
```

## 6. MVP 开发任务

- 建立 goals 表。
- 支持 goal priority 计算。
- 支持 goal conflict 检测。
- 支持基于记忆生成 suggested_goals。
- 支持用户批准或拒绝中高风险目标。
