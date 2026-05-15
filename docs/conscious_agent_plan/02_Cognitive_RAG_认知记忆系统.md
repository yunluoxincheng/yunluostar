# 02. Cognitive RAG：认知记忆系统

## 1. 为什么普通 RAG 不够

普通 RAG 的流程是：

```text
Query → Retrieve Documents → Add to Context → Generate Answer
```

它的问题是：

- 记的是文档，不是经历。
- 只在回答时使用记忆，不在决策时使用记忆。
- 没有记忆巩固。
- 没有遗忘机制。
- 不会更新自我模型。
- 不参与目标选择。

主体型 Agent 需要的是：

```text
Experience → Encode → Store → Consolidate → Retrieve → Reason → Act → Reflect → Update
```

## 2. 记忆对象设计

普通 RAG 存文本块。Cognitive RAG 存记忆对象。

```json
{
  "memory_id": "ep_2026_05_15_001",
  "type": "episodic",
  "time": "2026-05-15T10:30:00+08:00",
  "context": "与用户讨论主体型 Agent 架构",
  "event": "用户提出改造 RAG 的问题",
  "agent_action": "解释 RAG 应升级为认知记忆系统",
  "outcome": "用户继续询问改造之后的开发路线",
  "lesson": "用户需要工程化、阶段化的开发规划",
  "importance": 0.88,
  "confidence": 0.9,
  "related_goals": ["构建主体型 Agent 原型"],
  "tags": ["RAG", "memory", "agent_architecture"]
}
```

## 3. 记忆分层

### 工作记忆

当前正在处理的任务状态。

### 情节记忆

Agent 亲历过的事件、任务、错误、互动。

### 语义记忆

从多次经历或外部资料中抽象出的稳定知识。

### 自我记忆

经历如何改变 Agent 的自我模型和行为策略。

### 用户记忆

长期协作对象的偏好、目标、知识水平和历史互动。

## 4. 记忆唤醒机制

检索不应只靠 embedding 相似度，还应综合：

```text
score =
semantic_similarity
+ goal_relevance
+ importance
+ recency
+ self_relevance
+ user_relevance
+ risk_relevance
- decay
- conflict_penalty
```

## 5. 记忆巩固流程

```text
原始交互日志
  ↓
事件抽取
  ↓
重要性评分
  ↓
分类：情节 / 语义 / 自我 / 用户
  ↓
冲突检测
  ↓
遗忘与降权
  ↓
更新长期记忆、自我模型、用户模型、目标系统
```

## 6. 遗忘机制

记忆状态：

- active：活跃记忆
- latent：潜伏记忆
- archived：归档记忆
- deprecated：已废弃记忆
- conflicted：冲突记忆

遗忘依据：

- 时间衰减
- 重要性下降
- 用户纠正
- 新证据冲突
- 长期未访问
- 低置信度

## 7. MVP 实现

第一版只需要：

- SQLite / PostgreSQL 存结构化记忆。
- Chroma / Qdrant 存 embedding。
- LLM 做记忆抽取、总结和巩固。
- 每次对话结束后运行 memory_consolidator。
- 下一次对话前运行 memory_awakener。
