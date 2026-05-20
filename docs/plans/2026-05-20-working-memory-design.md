# Working Memory 设计文档

## 概述

为 Agent 添加会话级工作记忆，使其在多轮对话中维护当前状态（目标、上下文、假设、问题、风险），并在会话恢复时保持连续性。

## 设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 生命周期 | 会话级 | MVP 最简单，与现有 session 架构对接 |
| 恢复策略 | 原样恢复 | 快照通常不大，过时内容在对话中自然更新 |
| 更新时机 | 3 个 MVP 扩展到 6 个 | awakening 后注入、thinking 前读取、reflecting 后更新 |
| 字段 | 5 个核心字段 | 砍掉 attention_focus（与 current_context 合并）和 plan_state（阶段 6） |
| 存储方式 | 单块 JSON blob | 工作记忆是整体状态，不需要独立查询 |
| LLM 更新 | 合并到 reflector 调用 | 节省 LLM 调用，反思与 WM 更新强相关 |

## 数据模型

### 数据库表 `working_memory_snapshots`

```sql
CREATE TABLE working_memory_snapshots (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  snapshot TEXT NOT NULL,  -- JSON blob
  episode_id TEXT,         -- 触发更新的 episode
  created_at INTEGER NOT NULL
);
```

### Snapshot JSON 结构

```json
{
  "current_goal": "设计主体型 Agent 的开发路线",
  "current_context": "用户正在从理论讨论转向工程实现",
  "active_hypotheses": ["主体型 Agent 需要从 Cognitive RAG 开始"],
  "open_questions": ["MVP 应先做哪些模块？"],
  "risk_flags": ["不要宣称主观意识已被实现"]
}
```

### WorkingMemory 接口

```typescript
interface WorkingMemory {
  readonly currentGoal: string | null;
  readonly currentContext: string;
  readonly activeHypotheses: readonly string[];
  readonly openQuestions: readonly string[];
  readonly riskFlags: readonly string[];
}
```

不可变设计：每次更新返回新实例，不修改原对象。`createDefaultWorkingMemory()` 提供空状态起点。

## Controller 流水线

改造后的流水线：

```
restore WM → awakening → inject WM to context → thinking → recording
→ reflecting [+ LLM 输出 WM 更新] → apply WM update → consolidating → correcting → save WM snapshot
```

### 新增阶段

1. **restore WM** — 用 sessionId 查最新快照，反序列化为 WorkingMemory。首次会话返回默认值。
2. **inject WM to context** — 在 buildCognitiveContext 中追加工作记忆上下文。
3. **apply WM update** — 用 reflector 输出合并当前 WM，生成新的不可变实例。
4. **save WM snapshot** — 流水线最后保存新快照。

PipelineStage 增加 `"restoring"` 和 `"saving"`。

## Reflector 修改

- prompt 中加入当前工作记忆状态
- 输出 schema 增加 `workingMemoryUpdate` 字段（可选）
- 缺失字段保留原值不变

输出结构：
```typescript
{
  whatWorked: string | null;
  whatFailed: string | null;
  lessons: string | null;
  updateCandidates: string | null;
  workingMemoryUpdate?: {
    current_goal?: string | null;
    current_context?: string;
    active_hypotheses?: string[];
    open_questions?: string[];
    risk_flags?: string[];
  };
}
```

## CLI 集成

交互式 shell 新增 `/wm` 只读命令，展示当前工作记忆状态。

ChatTrace 增加 `restoredSnapshotId` 和 `savedSnapshotId` 用于追踪。

## 实现文件清单

| 文件 | 说明 |
|------|------|
| `src/models/working-memory.ts` | WorkingMemory 接口、工厂函数、合并逻辑 |
| `src/db/working-memory-repository.ts` | 快照 CRUD（save、findLatestBySession） |
| `src/memory/context-builder.ts` | 修改：注入工作记忆到认知上下文 |
| `src/metacognition/reflector.ts` | 修改：prompt 和输出 schema 增加 WM |
| `src/agent/controller.ts` | 修改：集成 WM restore/update/save 到流水线 |
| `src/cli/interactive-router.ts` | 修改：增加 /wm 命令 |
| `src/models/schemas.ts` | 修改：ChatTrace 增加 snapshot 追踪字段 |
| `src/db/schema.ts` | 修改：增加 working_memory_snapshots 表定义 |
| `tests/unit/working-memory.test.ts` | WorkingMemory 单元测试 |
| `tests/unit/repository.test.ts` | 修改：增加 WM repository 测试 |

## 未来扩展点（非 MVP）

- 阶段 4（Goal System）：目标系统选择后更新 current_goal
- 阶段 6（Planning）：规划器生成后更新 plan_state 字段
- 阶段 8（持续运行闭环）：全局级 / 双层工作记忆
- attention_focus 字段（与 current_context 合并后可按需拆分）
