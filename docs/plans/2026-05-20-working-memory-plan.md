# Working Memory 实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 Agent 添加会话级工作记忆，使其在多轮对话中维护当前状态，并在会话恢复时保持连续性。

**Architecture:** 新增 WorkingMemory 值对象和 working_memory_snapshots 表。工作记忆通过 JSON blob 存储，每次更新返回不可变新实例。在 reflector 的 LLM 调用中合并工作记忆更新输出，避免额外 LLM 调用。Controller 流水线新增 restore/inject/save 三个环节。

**Tech Stack:** TypeScript, Drizzle ORM (SQLite), Zod, Vitest

---

### Task 1: 数据库 Schema — working_memory_snapshots 表

**Files:**
- Modify: `src/db/schema.ts` (末尾追加)
- Modify: `src/db/migrate.ts` (确认不需要改，已有 runMigrations)

**Step 1: 在 schema.ts 末尾添加 working_memory_snapshots 表定义**

```typescript
export const workingMemorySnapshots = sqliteTable("working_memory_snapshots", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  snapshot: text("snapshot").notNull(),
  episodeId: text("episode_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
```

**Step 2: 在 migrate.ts 确认表会被创建**

确认 `runMigrations` 函数会为新表生成 CREATE TABLE。查看当前实现方式，如果用的是 Drizzle 的 migrate，需要运行 `npm run db:init` 重新生成 migration 文件。如果用的是手动 CREATE TABLE，需要加上新表。

**Step 3: Commit**

```bash
git add src/db/schema.ts src/db/migrate.ts
git commit -m "feat: add working_memory_snapshots table schema"
```

---

### Task 2: WorkingMemory 值对象

**Files:**
- Create: `src/models/working-memory.ts`
- Create: `tests/unit/working-memory.test.ts`

**Step 1: 写失败测试**

创建 `tests/unit/working-memory.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  createDefaultWorkingMemory,
  mergeWorkingMemoryUpdate,
  serializeWorkingMemory,
  deserializeWorkingMemory,
} from "../../src/models/working-memory.js";

describe("createDefaultWorkingMemory", () => {
  it("returns a working memory with empty defaults", () => {
    const wm = createDefaultWorkingMemory();
    expect(wm.currentGoal).toBeNull();
    expect(wm.currentContext).toBe("");
    expect(wm.activeHypotheses).toEqual([]);
    expect(wm.openQuestions).toEqual([]);
    expect(wm.riskFlags).toEqual([]);
  });
});

describe("mergeWorkingMemoryUpdate", () => {
  it("returns a new WorkingMemory with specified fields updated", () => {
    const base = createDefaultWorkingMemory();
    const updated = mergeWorkingMemoryUpdate(base, {
      currentGoal: "design the memory system",
      currentContext: "user is asking about architecture",
    });
    expect(updated.currentGoal).toBe("design the memory system");
    expect(updated.currentContext).toBe("user is asking about architecture");
    expect(updated.activeHypotheses).toEqual([]);
    // original is unchanged (immutable)
    expect(base.currentGoal).toBeNull();
  });

  it("preserves original fields when update is undefined", () => {
    const base = createDefaultWorkingMemory();
    const updated = mergeWorkingMemoryUpdate(base, {
      currentGoal: "new goal",
    });
    expect(updated.currentGoal).toBe("new goal");
    expect(updated.currentContext).toBe("");
    expect(updated.activeHypotheses).toEqual([]);
  });

  it("replaces array fields entirely", () => {
    const base = createDefaultWorkingMemory();
    const updated = mergeWorkingMemoryUpdate(base, {
      activeHypotheses: ["hypothesis 1", "hypothesis 2"],
      riskFlags: ["risk"],
    });
    expect(updated.activeHypotheses).toEqual(["hypothesis 1", "hypothesis 2"]);
    expect(updated.riskFlags).toEqual(["risk"]);
    expect(updated.openQuestions).toEqual([]);
  });
});

describe("serializeWorkingMemory / deserializeWorkingMemory", () => {
  it("round-trips a WorkingMemory through JSON", () => {
    const original = mergeWorkingMemoryUpdate(createDefaultWorkingMemory(), {
      currentGoal: "test goal",
      currentContext: "test context",
      activeHypotheses: ["h1"],
      openQuestions: ["q1"],
      riskFlags: ["r1"],
    });
    const json = serializeWorkingMemory(original);
    const restored = deserializeWorkingMemory(json);
    expect(restored).toEqual(original);
  });

  it("deserialize returns defaults for missing fields", () => {
    const json = '{"current_goal":"only goal"}';
    const restored = deserializeWorkingMemory(json);
    expect(restored.currentGoal).toBe("only goal");
    expect(restored.currentContext).toBe("");
    expect(restored.activeHypotheses).toEqual([]);
  });

  it("deserialize handles invalid JSON gracefully", () => {
    const restored = deserializeWorkingMemory("not json");
    expect(restored).toEqual(createDefaultWorkingMemory());
  });
});
```

**Step 2: 运行测试确认失败**

Run: `npx vitest run tests/unit/working-memory.test.ts`
Expected: FAIL — module not found

**Step 3: 实现 WorkingMemory 模块**

创建 `src/models/working-memory.ts`:

```typescript
export interface WorkingMemory {
  readonly currentGoal: string | null;
  readonly currentContext: string;
  readonly activeHypotheses: readonly string[];
  readonly openQuestions: readonly string[];
  readonly riskFlags: readonly string[];
}

export interface WorkingMemoryUpdate {
  readonly currentGoal?: string | null;
  readonly currentContext?: string;
  readonly activeHypotheses?: readonly string[];
  readonly openQuestions?: readonly string[];
  readonly riskFlags?: readonly string[];
}

export function createDefaultWorkingMemory(): WorkingMemory {
  return {
    currentGoal: null,
    currentContext: "",
    activeHypotheses: [],
    openQuestions: [],
    riskFlags: [],
  };
}

export function mergeWorkingMemoryUpdate(base: WorkingMemory, update: WorkingMemoryUpdate): WorkingMemory {
  return {
    currentGoal: update.currentGoal !== undefined ? update.currentGoal : base.currentGoal,
    currentContext: update.currentContext !== undefined ? update.currentContext : base.currentContext,
    activeHypotheses: update.activeHypotheses !== undefined ? [...update.activeHypotheses] : [...base.activeHypotheses],
    openQuestions: update.openQuestions !== undefined ? [...update.openQuestions] : [...base.openQuestions],
    riskFlags: update.riskFlags !== undefined ? [...update.riskFlags] : [...base.riskFlags],
  };
}

export function serializeWorkingMemory(wm: WorkingMemory): string {
  return JSON.stringify({
    current_goal: wm.currentGoal,
    current_context: wm.currentContext,
    active_hypotheses: wm.activeHypotheses,
    open_questions: wm.openQuestions,
    risk_flags: wm.riskFlags,
  });
}

export function deserializeWorkingMemory(json: string): WorkingMemory {
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    return {
      currentGoal: typeof parsed.current_goal === "string" ? parsed.current_goal : parsed.current_goal === null ? null : null,
      currentContext: typeof parsed.current_context === "string" ? parsed.current_context : "",
      activeHypotheses: Array.isArray(parsed.active_hypotheses) ? parsed.active_hypotheses.filter((h: unknown) => typeof h === "string") : [],
      openQuestions: Array.isArray(parsed.open_questions) ? parsed.open_questions.filter((q: unknown) => typeof q === "string") : [],
      riskFlags: Array.isArray(parsed.risk_flags) ? parsed.risk_flags.filter((r: unknown) => typeof r === "string") : [],
    };
  } catch {
    return createDefaultWorkingMemory();
  }
}
```

**Step 4: 运行测试确认通过**

Run: `npx vitest run tests/unit/working-memory.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/models/working-memory.ts tests/unit/working-memory.test.ts
git commit -m "feat: add WorkingMemory value object with serialization"
```

---

### Task 3: WorkingMemory Repository

**Files:**
- Create: `src/db/working-memory-repository.ts`
- Modify: `tests/unit/repository.test.ts`

**Step 1: 写失败测试**

在 `tests/unit/repository.test.ts` 中追加（先读取该文件末尾），添加 working memory snapshot 相关测试：

```typescript
describe("WorkingMemoryRepository", () => {
  let db: ReturnType<typeof createTestDb>;
  let repo: ReturnType<typeof createWorkingMemoryRepository>;

  beforeEach(() => {
    db = createTestDb();
    repo = createWorkingMemoryRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it("saves and retrieves latest snapshot by session", () => {
    repo.save({
      id: generateId(),
      sessionId: "s1",
      snapshot: '{"current_goal":"first"}',
      episodeId: "ep1",
      createdAt: new Date(),
    });

    const latest = repo.findLatestBySession("s1");
    expect(latest).not.toBeNull();
    expect(latest!.snapshot).toBe('{"current_goal":"first"}');
    expect(latest!.sessionId).toBe("s1");
  });

  it("returns null when no snapshot exists for session", () => {
    expect(repo.findLatestBySession("nonexistent")).toBeNull();
  });

  it("returns the most recent snapshot for a session", () => {
    repo.save({
      id: generateId(),
      sessionId: "s1",
      snapshot: '{"current_goal":"first"}',
      episodeId: "ep1",
      createdAt: new Date(1000),
    });
    repo.save({
      id: generateId(),
      sessionId: "s1",
      snapshot: '{"current_goal":"second"}',
      episodeId: "ep2",
      createdAt: new Date(2000),
    });

    const latest = repo.findLatestBySession("s1");
    expect(latest!.snapshot).toBe('{"current_goal":"second"}');
  });
});
```

**Step 2: 运行测试确认失败**

Run: `npx vitest run tests/unit/repository.test.ts`
Expected: FAIL — module not found

**Step 3: 实现 repository**

创建 `src/db/working-memory-repository.ts`:

```typescript
import { desc, eq } from "drizzle-orm";
import type { DbClient } from "./connection.js";
import { workingMemorySnapshots } from "./schema.js";

export function createWorkingMemoryRepository(db: DbClient) {
  return {
    save(snapshot: typeof workingMemorySnapshots.$inferInsert) {
      return db.insert(workingMemorySnapshots).values(snapshot).returning().get();
    },

    findLatestBySession(sessionId: string) {
      return db
        .select()
        .from(workingMemorySnapshots)
        .where(eq(workingMemorySnapshots.sessionId, sessionId))
        .orderBy(desc(workingMemorySnapshots.createdAt))
        .limit(1)
        .get();
    },
  };
}

export type WorkingMemoryRepository = ReturnType<typeof createWorkingMemoryRepository>;
```

**Step 4: 运行测试确认通过**

Run: `npx vitest run tests/unit/repository.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/db/working-memory-repository.ts tests/unit/repository.test.ts
git commit -m "feat: add WorkingMemoryRepository with save and findLatestBySession"
```

---

### Task 4: 扩展 Reflector — 输出工作记忆更新

**Files:**
- Modify: `src/llm/client.ts` (ReflectionOutput 接口)
- Modify: `src/llm/safe-outputs.ts` (safeReflection)
- Modify: `src/llm/deterministic-client.ts` (reflect 方法)
- Modify: `src/llm/openai-compatible-client.ts` (reflect prompt)
- Create: `tests/unit/working-memory-update.test.ts`

**Step 1: 写失败测试**

创建 `tests/unit/working-memory-update.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { safeReflection } from "../../src/llm/safe-outputs.js";

describe("safeReflection with workingMemoryUpdate", () => {
  it("extracts workingMemoryUpdate when present", () => {
    const result = safeReflection({
      whatWorked: "ok",
      whatFailed: "none",
      lessons: "learned something",
      updateCandidates: "[]",
      workingMemoryUpdate: {
        current_goal: "new goal",
        current_context: "new context",
        active_hypotheses: ["h1"],
        open_questions: ["q1"],
        risk_flags: [],
      },
    });
    expect(result.workingMemoryUpdate).toEqual({
      current_goal: "new goal",
      current_context: "new context",
      active_hypotheses: ["h1"],
      open_questions: ["q1"],
      risk_flags: [],
    });
  });

  it("returns undefined workingMemoryUpdate when absent", () => {
    const result = safeReflection({
      whatWorked: "ok",
      whatFailed: "none",
      lessons: "learned something",
      updateCandidates: "[]",
    });
    expect(result.workingMemoryUpdate).toBeUndefined();
  });

  it("returns undefined when workingMemoryUpdate is null", () => {
    const result = safeReflection({
      whatWorked: "ok",
      whatFailed: "none",
      lessons: "learned something",
      updateCandidates: "[]",
      workingMemoryUpdate: null,
    });
    expect(result.workingMemoryUpdate).toBeUndefined();
  });
});
```

**Step 2: 运行测试确认失败**

Run: `npx vitest run tests/unit/working-memory-update.test.ts`
Expected: FAIL — workingMemoryUpdate does not exist on type

**Step 3: 修改 ReflectionOutput 接口**

在 `src/llm/client.ts` 的 `ReflectionOutput` 接口中追加：

```typescript
export interface WorkingMemoryUpdateOutput {
  current_goal?: string | null;
  current_context?: string;
  active_hypotheses?: string[];
  open_questions?: string[];
  risk_flags?: string[];
}

export interface ReflectionOutput {
  whatWorked: string;
  whatFailed: string;
  lessons: string;
  updateCandidates: string;
  workingMemoryUpdate?: WorkingMemoryUpdateOutput;
}
```

**Step 4: 修改 safeReflection**

在 `src/llm/safe-outputs.ts` 的 `safeReflection` 函数中追加：

```typescript
export function safeReflection(raw: Partial<ReflectionOutput> | null | undefined): ReflectionOutput {
  const update = raw?.workingMemoryUpdate;
  const hasValidUpdate = update != null && typeof update === "object" && !Array.isArray(update);

  return {
    whatWorked: asString(raw?.whatWorked, "Response generated"),
    whatFailed: asString(raw?.whatFailed, "None identified"),
    lessons: asString(raw?.lessons, FALLBACK_LESSON),
    updateCandidates: asString(raw?.updateCandidates, "[]"),
    workingMemoryUpdate: hasValidUpdate
      ? {
          current_goal: typeof update.current_goal === "string" ? update.current_goal : update.current_goal === null ? null : undefined,
          current_context: typeof update.current_context === "string" ? update.current_context : undefined,
          active_hypotheses: Array.isArray(update.active_hypotheses) ? update.active_hypotheses : undefined,
          open_questions: Array.isArray(update.open_questions) ? update.open_questions : undefined,
          risk_flags: Array.isArray(update.risk_flags) ? update.risk_flags : undefined,
        }
      : undefined,
  };
}
```

**Step 5: 修改 DeterministicLLMClient.reflect**

在 `src/llm/deterministic-client.ts` 的 `reflect` 方法返回值中追加：

```typescript
async reflect(userInput: string, agentResponse: string, _context: string): Promise<ReflectionOutput> {
  return {
    whatWorked: "Response was generated successfully",
    whatFailed: "No specific failure identified",
    lessons: `Interaction about: ${userInput.slice(0, 60)}`,
    updateCandidates: "[]",
  };
}
```

注意：deterministic client 不需要返回 workingMemoryUpdate（返回 undefined 即可），因为 deterministic 模式用于测试，工作记忆更新由 controller 层测试覆盖。

**Step 6: 修改 OpenAICompatibleLLMClient.reflect prompt**

在 `src/llm/openai-compatible-client.ts` 的 `reflect` 方法中，更新 system prompt：

```typescript
async reflect(userInput: string, agentResponse: string, context: string): Promise<ReflectionOutput> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "Reflect on this interaction. " +
        'Respond with valid JSON only: {"whatWorked":"...","whatFailed":"...","lessons":"...","updateCandidates":"...","workingMemoryUpdate":{"current_goal":"...","current_context":"...","active_hypotheses":["..."],"open_questions":["..."],"risk_flags":["..."]}}. ' +
        "workingMemoryUpdate is optional — only include it if the interaction reveals new goals, context shifts, hypotheses, questions, or risks. " +
        "Omit fields inside workingMemoryUpdate that should remain unchanged.",
    },
    {
      role: "user",
      content: `User: ${userInput}\nAgent: ${agentResponse}\nContext: ${context}`,
    },
  ];
  const data = await this.executeWithRetry(() => this.jsonRequest(messages));
  return safeReflection(parseJsonPartial(data?.choices?.[0]?.message?.content));
}
```

**Step 7: 运行测试确认通过**

Run: `npx vitest run tests/unit/working-memory-update.test.ts`
Expected: PASS

同时确认现有测试不受影响:
Run: `npx vitest run`
Expected: 之前通过的 95 个测试仍然通过

**Step 8: Commit**

```bash
git add src/llm/client.ts src/llm/safe-outputs.ts src/llm/deterministic-client.ts src/llm/openai-compatible-client.ts tests/unit/working-memory-update.test.ts
git commit -m "feat: extend reflector output with workingMemoryUpdate field"
```

---

### Task 5: 修改 context-builder — 注入工作记忆

**Files:**
- Modify: `src/memory/context-builder.ts`

**Step 1: 修改 buildCognitiveContext 签名和实现**

将函数改为接受可选的 WorkingMemory 参数：

```typescript
import type { AwakenedContext } from "./memory-awakener.js";
import type { WorkingMemory } from "../models/working-memory.js";

export function buildCognitiveContext(awakened: AwakenedContext, wm?: WorkingMemory): string {
  const parts: string[] = [];

  if (awakened.recalledMemories.length > 0) {
    parts.push("Relevant memories:");
    for (const mem of awakened.recalledMemories) {
      parts.push(`- ${mem.content} (confidence: ${mem.confidence.toFixed(2)})`);
    }
  }

  if (awakened.userModelEntries.length > 0) {
    parts.push("User preferences:");
    for (const entry of awakened.userModelEntries) {
      parts.push(`- ${entry.key}: ${entry.value} (confidence: ${entry.confidence.toFixed(2)})`);
    }
  }

  if (awakened.selfModelEntries.length > 0) {
    parts.push("Self awareness:");
    for (const entry of awakened.selfModelEntries) {
      parts.push(`- ${entry.trait}: ${entry.value}`);
    }
  }

  if (wm && (wm.currentGoal || wm.currentContext || wm.activeHypotheses.length > 0 || wm.openQuestions.length > 0 || wm.riskFlags.length > 0)) {
    parts.push("Current working state:");
    if (wm.currentGoal) parts.push(`- Goal: ${wm.currentGoal}`);
    if (wm.currentContext) parts.push(`- Context: ${wm.currentContext}`);
    for (const h of wm.activeHypotheses) parts.push(`- Hypothesis: ${h}`);
    for (const q of wm.openQuestions) parts.push(`- Open question: ${q}`);
    for (const r of wm.riskFlags) parts.push(`- Risk: ${r}`);
  }

  return parts.join("\n");
}
```

**Step 2: 运行现有测试确认不受影响**

Run: `npx vitest run`
Expected: 全部通过（因为 wm 参数是可选的，原有调用不需要改动）

**Step 3: Commit**

```bash
git add src/memory/context-builder.ts
git commit -m "feat: inject WorkingMemory into cognitive context"
```

---

### Task 6: 集成到 Controller 流水线

**Files:**
- Modify: `src/agent/controller.ts`
- Modify: `src/models/schemas.ts` (ChatTrace 增加字段)
- Modify: `src/models/defaults.ts` (createDefaultTrace 更新)

**Step 1: 修改 ChatTrace schema**

在 `src/models/schemas.ts` 的 `chatTraceSchema` 中追加：

```typescript
export const chatTraceSchema = z.object({
  episodeId: z.string(),
  reflectionId: z.string().optional(),
  recalledMemoryIds: z.array(z.string()).default([]),
  appliedUserModelIds: z.array(z.string()).default([]),
  appliedSelfModelIds: z.array(z.string()).default([]),
  restoredSnapshotId: z.string().optional(),
  savedSnapshotId: z.string().optional(),
});
```

**Step 2: 修改 createDefaultTrace**

在 `src/models/defaults.ts` 的 `createDefaultTrace` 中追加：

```typescript
export function createDefaultTrace(episodeId: string): ChatTrace {
  return {
    episodeId,
    reflectionId: undefined,
    recalledMemoryIds: [],
    appliedUserModelIds: [],
    appliedSelfModelIds: [],
    restoredSnapshotId: undefined,
    savedSnapshotId: undefined,
  };
}
```

**Step 3: 修改 Controller**

在 `src/agent/controller.ts` 中：
- 导入 `createWorkingMemoryRepository`
- 导入 `createDefaultWorkingMemory`, `mergeWorkingMemoryUpdate`, `serializeWorkingMemory`, `deserializeWorkingMemory` 和 `WorkingMemory` 类型
- 导入 `generateId`
- PipelineStage 增加 `"restoring"` 和 `"saving"`
- 在 `chat()` 方法中集成 WM restore/update/save

改造后的 controller:

```typescript
import type { LLMClient } from "../llm/client.js";
import type { DbClient } from "../db/connection.js";
import { getRawSqlite } from "../db/connection.js";
import { createEpisodesRepository } from "../db/episodes-repository.js";
import { createSemanticMemoriesRepository } from "../db/semantic-memories-repository.js";
import { createUserModelRepository } from "../db/user-model-repository.js";
import { createSelfModelRepository } from "../db/self-model-repository.js";
import { createReflectionsRepository } from "../db/reflections-repository.js";
import { createAuditLogRepository } from "../db/audit-log-repository.js";
import { createWorkingMemoryRepository } from "../db/working-memory-repository.js";
import type { EmbeddingClient } from "../llm/embedding-client.js";
import { createEmbeddingStore } from "../memory/embedding-store.js";
import { createCompositeScorer } from "../memory/composite-scorer.js";
import { recordEpisode } from "../memory/episodic/episode-recorder.js";
import { awakenMemories } from "../memory/memory-awakener.js";
import { buildCognitiveContext } from "../memory/context-builder.js";
import { reflectAndPersist } from "../metacognition/reflector.js";
import { consolidate } from "../memory/memory-consolidator.js";
import { applyCorrection } from "../memory/correction-handler.js";
import { createDefaultTrace, generateId } from "../models/defaults.js";
import type { ChatTrace } from "../models/schemas.js";
import {
  createDefaultWorkingMemory,
  mergeWorkingMemoryUpdate,
  serializeWorkingMemory,
  deserializeWorkingMemory,
} from "../models/working-memory.js";

export interface AgentConfig {
  sessionId: string;
  onToken?: (token: string) => void;
  onStage?: (stage: PipelineStage) => void;
}

export type PipelineStage =
  | "restoring"
  | "awakening"
  | "thinking"
  | "recording"
  | "reflecting"
  | "consolidating"
  | "correcting"
  | "saving"
  | "done";

export interface AgentResult {
  response: string;
  trace: ChatTrace;
}

export function createAgentController(llm: LLMClient, db: DbClient, embeddingClient?: EmbeddingClient) {
  const episodesRepo = createEpisodesRepository(db);
  const semanticMemoriesRepo = createSemanticMemoriesRepository(db);
  const userModelRepo = createUserModelRepository(db);
  const selfModelRepo = createSelfModelRepository(db);
  const reflectionsRepo = createReflectionsRepository(db);
  const auditRepo = createAuditLogRepository(db);
  const wmRepo = createWorkingMemoryRepository(db);

  const embeddingStore = embeddingClient
    ? createEmbeddingStore(getRawSqlite(db))
    : undefined;
  const scorer = embeddingClient && embeddingStore
    ? createCompositeScorer(embeddingClient, embeddingStore)
    : undefined;

  return {
    async chat(userInput: string, config: AgentConfig): Promise<AgentResult> {
      const { onStage } = config;

      onStage?.("restoring");
      const latestSnapshot = wmRepo.findLatestBySession(config.sessionId);
      let wm = latestSnapshot
        ? deserializeWorkingMemory(latestSnapshot.snapshot)
        : createDefaultWorkingMemory();

      onStage?.("awakening");
      const awakened = await awakenMemories(
        userInput,
        semanticMemoriesRepo,
        userModelRepo,
        selfModelRepo,
        scorer ?? { score: () => [] },
      );

      const cognitiveContext = buildCognitiveContext(awakened, wm);

      onStage?.("thinking");
      const response = await llm.generateResponse(cognitiveContext, userInput, config.onToken);

      onStage?.("recording");
      const { episodeId, extraction } = await recordEpisode(llm, episodesRepo, auditRepo, {
        sessionId: config.sessionId,
        userInput,
        agentResponse: response,
      });

      const trace = createDefaultTrace(episodeId);
      if (latestSnapshot) trace.restoredSnapshotId = latestSnapshot.id;
      trace.recalledMemoryIds = awakened.recalledMemories.map((m) => m.id);
      trace.appliedUserModelIds = awakened.userModelEntries.map((e) => e.id);
      trace.appliedSelfModelIds = awakened.selfModelEntries.map((e) => e.id);

      onStage?.("reflecting");
      const { reflectionId, reflection: reflectionOutput } = await reflectAndPersist(llm, reflectionsRepo, auditRepo, {
        episodeId,
        userInput,
        agentResponse: response,
        context: cognitiveContext,
        extraction,
      });
      trace.reflectionId = reflectionId;

      if (reflectionOutput.workingMemoryUpdate) {
        wm = mergeWorkingMemoryUpdate(wm, reflectionOutput.workingMemoryUpdate);
      }

      onStage?.("consolidating");
      const consolidationResult = await consolidate(llm, semanticMemoriesRepo, userModelRepo, selfModelRepo, auditRepo, {
        episodeId,
        extraction,
        reflectionOutput,
      }, embeddingClient, embeddingStore);

      onStage?.("correcting");
      for (const newId of consolidationResult.userModelIds) {
        const newEntry = userModelRepo.findById(newId);
        if (!newEntry) continue;
        const existing = userModelRepo.findByKey(newEntry.key);
        const older = existing.filter((e) => e.id !== newId && e.status === "active");
        for (const old of older) {
          await applyCorrection(
            semanticMemoriesRepo, userModelRepo, selfModelRepo, auditRepo,
            { table: "user_model", oldId: old.id, newId, reason: `Superseded by newer entry for key "${newEntry.key}"` },
          );
        }
      }

      for (const newId of consolidationResult.selfModelIds) {
        const newEntry = selfModelRepo.findById(newId);
        if (!newEntry) continue;
        const existing = selfModelRepo.findByTrait(newEntry.trait);
        const older = existing.filter((e) => e.id !== newId && e.status === "active");
        for (const old of older) {
          await applyCorrection(
            semanticMemoriesRepo, userModelRepo, selfModelRepo, auditRepo,
            { table: "self_model", oldId: old.id, newId, reason: `Superseded by newer entry for trait "${newEntry.trait}"` },
          );
        }
      }

      onStage?.("saving");
      const snapshotId = generateId();
      wmRepo.save({
        id: snapshotId,
        sessionId: config.sessionId,
        snapshot: serializeWorkingMemory(wm),
        episodeId,
        createdAt: new Date(),
      });
      trace.savedSnapshotId = snapshotId;

      onStage?.("done");
      return { response, trace };
    },
  };
}

export type AgentController = ReturnType<typeof createAgentController>;
```

**Step 4: 运行全部测试**

Run: `npx vitest run`
Expected: 全部通过

**Step 5: Commit**

```bash
git add src/agent/controller.ts src/models/schemas.ts src/models/defaults.ts
git commit -m "feat: integrate WorkingMemory into controller pipeline"
```

---

### Task 7: CLI — /wm 命令

**Files:**
- Modify: `src/cli/interactive-router.ts`
- Modify: `src/cli/tui.ts`

**Step 1: 在 InteractiveRouter 中添加 /wm 处理**

在 `handleSlashCommand` 的 switch 中，在 `/reflections` case 之后，`default` 之前添加：

```typescript
case "/wm":
  return { action: "continue", output: await this.inspectWorkingMemory() };
```

添加 `inspectWorkingMemory` 方法：

```typescript
private async inspectWorkingMemory(): Promise<string> {
  const db = createDbConnection(this.config.databasePath);
  try {
    runMigrations(db);
    const repo = createWorkingMemoryRepository(db);
    const latest = repo.findLatestBySession(this.sessionId);
    if (!latest) return chalk.dim("  (no working memory snapshot)");
    const wm = deserializeWorkingMemory(latest.snapshot);
    return formatWorkingMemory(wm);
  } finally {
    closeDbConnection(db);
  }
}
```

在文件顶部导入 `createWorkingMemoryRepository` 和 `deserializeWorkingMemory`。

**Step 2: 在 tui.ts 中添加 formatWorkingMemory**

```typescript
export function formatWorkingMemory(wm: {
  currentGoal: string | null;
  currentContext: string;
  activeHypotheses: readonly string[];
  openQuestions: readonly string[];
  riskFlags: readonly string[];
}): string {
  const lines: string[] = [`${theme.title("Working Memory")}`, ""];

  if (wm.currentGoal) {
    lines.push(keyValue("goal", wm.currentGoal, theme.goal));
  }
  if (wm.currentContext) {
    lines.push(keyValue("context", wm.currentContext, white));
  }
  if (wm.activeHypotheses.length > 0) {
    lines.push(`${theme.quiet("hypotheses".padEnd(12))} (${wm.activeHypotheses.length})`);
    wm.activeHypotheses.forEach((h, i) => lines.push(`  ${bold(String(i + 1))}. ${h}`));
  }
  if (wm.openQuestions.length > 0) {
    lines.push(`${theme.quiet("questions".padEnd(12))} (${wm.openQuestions.length})`);
    wm.openQuestions.forEach((q, i) => lines.push(`  ${bold(String(i + 1))}. ${q}`));
  }
  if (wm.riskFlags.length > 0) {
    lines.push(`${theme.quiet("risks".padEnd(12))} (${wm.riskFlags.length})`);
    wm.riskFlags.forEach((r, i) => lines.push(`  ${red(String(i + 1))}. ${r}`));
  }
  if (!wm.currentGoal && !wm.currentContext && wm.activeHypotheses.length === 0 && wm.openQuestions.length === 0 && wm.riskFlags.length === 0) {
    lines.push(dim("  (empty)"));
  }
  return "\n" + frame(lines, Math.min(termWidth(), 64) - 4) + "\n";
}
```

**Step 3: 在 formatHelp 中添加 /wm**

在 commands 数组中，`/reflections` 条目后追加：

```typescript
[theme.accent("/wm"),            "current working memory"],
```

**Step 4: 在 STAGE_LABELS 中添加新阶段**

在 `interactive-router.ts` 的 `STAGE_LABELS` 中追加：

```typescript
const STAGE_LABELS: Record<PipelineStage, string> = {
  restoring: "restoring working memory...",
  awakening: "awakening relevant memory...",
  thinking: "integrating context...",
  recording: "recording episode...",
  reflecting: "running metacognition...",
  consolidating: "consolidating memory...",
  correcting: "resolving correction...",
  saving: "saving working memory...",
  done: "",
};
```

**Step 5: 在 formatTrace 中追加 WM 追踪**

在 `tui.ts` 的 `formatTrace` 中，在 parts 数组构建后追加：

```typescript
if ((trace as any).restoredSnapshotId) {
  parts.push(theme.world(`wm`));
}
```

（注意：ChatTrace 类型已经更新，直接用 `trace.restoredSnapshotId` 即可。需要更新 formatTrace 的参数类型。）

更新 formatTrace 的参数类型：

```typescript
export function formatTrace(trace: {
  episodeId: string;
  reflectionId?: string;
  recalledMemoryIds: string[];
  appliedUserModelIds: string[];
  appliedSelfModelIds: string[];
  restoredSnapshotId?: string;
  savedSnapshotId?: string;
}): string {
```

并在 parts 构建时加入：

```typescript
if (trace.restoredSnapshotId || trace.savedSnapshotId) {
  parts.push(theme.world("wm"));
}
```

**Step 6: 运行测试**

Run: `npx vitest run`
Expected: 全部通过

**Step 7: Commit**

```bash
git add src/cli/interactive-router.ts src/cli/tui.ts
git commit -m "feat: add /wm command and working memory display to TUI"
```

---

### Task 8: 数据库迁移与构建验证

**Step 1: 重新生成 Drizzle migration**

Run: `npx drizzle-kit generate`
如果 migrate.ts 用的是手动 SQL，直接在 `runMigrations` 函数中添加 `working_memory_snapshots` 的 CREATE TABLE 语句。

**Step 2: 验证构建**

Run: `npm run build`
Expected: 无 TypeScript 错误

**Step 3: 运行完整测试套件**

Run: `npx vitest run`
Expected: 全部通过

**Step 4: 本地功能验证**

Run: `npm run db:init`（如果需要重新初始化）
Run: `npm run cli`
在交互式 shell 中测试：
1. 发送一条消息
2. 输入 `/wm` 查看工作记忆
3. 发送第二条消息
4. 输入 `/wm` 查看工作记忆是否更新

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: update migration and verify build for working memory"
```
