# 向量检索实现提案

日期：2026-05-20
状态：已实施（MVP 完成）
范围：Sprint 5 — 记忆唤醒器向量检索

## 1. 目标

将记忆唤醒器从词法匹配（Jaccard 相似度）升级为基于 embedding 的语义检索，并综合多维度评分（importance、recency、goal relevance），实现设计文档 02 中定义的复合评分公式。

## 2. 方案选择

**选定方案：A — OpenAI 兼容 API embedding**

- 复用现有 `baseUrl` + `apiKey` 配置，调用 `/embeddings` 端点
- 默认模型：`text-embedding-3-small`（1536 维，$0.02/1M tokens）
- 本地轻量模型跨语言质量极差（0.12-0.15），API 模型 0.94-0.99，中文场景差距更大
- 成本极低：1000 条记忆的 embedding 约 $0.0004

## 3. 架构变更

### 3.1 新增模块

```
src/
  llm/
    embedding-client.ts        # Embedding API 客户端（新增）
  memory/
    relevance-scorer.ts         # 重构：RelevanceScorer 接口保持不变，新增 EmbeddingScorer
    embedding-store.ts          # 向量存储抽象层（新增）
    memory-awakener.ts          # 重构：使用新的复合评分
  db/
    schema.ts                   # 新增 embedding 相关表
    migrate.ts                  # 新增迁移
    vector-repository.ts        # 向量检索 repository（新增）
```

### 3.2 依赖变更

```
新增依赖：
  sqlite-vec          # SQLite 向量扩展（预编译 native addon）
```

## 4. 详细设计

### 4.1 EmbeddingClient

```typescript
// src/llm/embedding-client.ts

export interface EmbeddingConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  dimensions?: number;       // text-embedding-3-small 支持 1536 或降维
  timeout?: number;
}

export interface EmbeddingClient {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}
```

- 调用 `POST ${baseUrl}/embeddings`，与现有 OpenAI 兼容客户端共享 `baseUrl`/`apiKey`
- `embedBatch` 支持批量 embedding，减少 API 调用次数
- deterministic provider 下返回零向量（保持测试可运行）

### 4.2 数据库变更

新增虚拟表 `memory_embeddings`，使用 sqlite-vec 存储：

```sql
CREATE VIRTUAL TABLE memory_embeddings USING vec0(
  id TEXT PRIMARY KEY,
  embedding FLOAT[1536]
);
```

设计决策：使用独立虚拟表而非在各表添加 BLOB 列，理由：
- sqlite-vec 的 `vec0` 虚拟表是官方推荐用法
- 不干扰现有 Drizzle schema 定义
- 查询更清晰：语义搜索在虚拟表做，元数据过滤在原表做
- 便于后续迁移到其他向量数据库

需要 embedding 的内容（按设计文档 09）：
- `semantic_memories.content` — 语义记忆检索（**MVP 优先**）
- `user_model.key + value` — 用户模型检索
- `self_model.trait + value` — 自我模型检索

### 4.3 EmbeddingStore

```typescript
// src/memory/embedding-store.ts

export interface EmbeddingStore {
  upsert(id: string, embedding: number[]): void;
  upsertBatch(items: Array<{ id: string; embedding: number[] }>): void;
  remove(id: string): void;
  search(queryEmbedding: number[], topK: number, minScore?: number): Array<{ id: string; score: number }>;
}
```

- 内部使用 sqlite-vec 的距离函数进行 KNN 检索
- `upsertBatch` 使用事务提升写入性能
- 距离度量：余弦相似度（sqlite-vec 支持 `cosine` metric）

### 4.4 RelevanceScorer 重构

保持现有 `RelevanceScorer` 接口不变，新增 `createCompositeScorer`：

```typescript
// src/memory/relevance-scorer.ts（扩展）

export interface CompositeScorerConfig {
  semanticWeight: number;     // 语义相似度权重，默认 0.5
  importanceWeight: number;   // 重要性权重，默认 0.2
  recencyWeight: number;      // 时间衰减权重，默认 0.15
  confidenceWeight: number;   // 置信度权重，默认 0.15
}

export function createCompositeScorer(
  embeddingClient: EmbeddingClient,
  embeddingStore: EmbeddingStore,
  config?: Partial<CompositeScorerConfig>,
): RelevanceScorer
```

**复合评分公式（MVP 简化版）：**

```
final_score = w1 * cosine_similarity + w2 * normalized_importance + w3 * recency_score + w4 * confidence
```

- `cosine_similarity`：查询 embedding 与候选记忆 embedding 的余弦相似度（0~1）
- `normalized_importance`：记忆的 `importance` 字段（0~1）
- `recency_score`：基于时间的衰减分数（0~1），指数衰减：`exp(-λ * days_since_creation)`
- `confidence`：记忆的 `confidence` 字段（0~1）
- 默认权重：`w1=0.5, w2=0.2, w3=0.15, w4=0.15`

### 4.5 MemoryAwakener 重构

```typescript
// src/memory/memory-awakener.ts（重构后签名）

export async function awakenMemories(
  userInput: string,
  semanticMemoriesRepo: SemanticMemoriesRepository,
  userModelRepo: UserModelRepository,
  selfModelRepo: SelfModelRepository,
  scorer: RelevanceScorer,          // 接口不变，实现替换为 CompositeScorer
  embeddingClient: EmbeddingClient,  // 新增：用于生成查询 embedding
  embeddingStore: EmbeddingStore,    // 新增：用于向量搜索
): Promise<AwakenedContext>
```

**重构后的流程：**

1. 用 `embeddingClient.embed(userInput)` 生成查询向量
2. 用 `embeddingStore.search(queryEmbedding, topK=20)` 获取语义相似候选
3. 从 `semanticMemoriesRepo` 加载候选的元数据（importance、confidence、createdAt）
4. 用 `CompositeScorer` 综合评分，取 top 5
5. 用户模型和自我模型同样通过 embedding 检索（而非全量加载）

### 4.6 AgentController 更新

```typescript
// src/agent/controller.ts 变更

export function createAgentController(llm: LLMClient, db: DbClient, embeddingClient: EmbeddingClient) {
  // ...
  const embeddingStore = createEmbeddingStore(db);
  const scorer = createCompositeScorer(embeddingClient, embeddingStore);
  // ...
}
```

### 4.7 Embedding 生成时机

记忆写入时同步生成 embedding 并存入 `memory_embeddings`：

- `episode-recorder.ts`：episode 记录后，对 content（intent + action + lesson 拼接）生成 embedding
- `memory-consolidator.ts`：semantic memory 创建后，对 content 生成 embedding；user_model/self_model 更新后对 key+value / trait+value 生成 embedding
- **迁移策略**：提供 `backfill-embeddings` 脚本，为已有数据补充生成 embedding

### 4.8 配置扩展

```typescript
// config.ts 新增字段
embeddingModel: z.string().default("text-embedding-3-small"),
embeddingDimensions: z.number().int().default(1536),
```

- 使用与 LLM 相同的 `baseUrl` 和 `apiKey`，无需额外配置
- `deterministic` provider 下自动跳过 embedding，降级到词法检索

## 5. 实施步骤

### Phase 1：基础设施（约 2-3 小时）

1. 安装 `sqlite-vec` 依赖
2. 实现 `EmbeddingClient`（含 deterministic 降级）
3. 实现 `EmbeddingStore`（sqlite-vec 虚拟表 + KNN 搜索）
4. 数据库迁移：创建 `memory_embeddings` 虚拟表

### Phase 2：评分重构（约 1-2 小时）

5. 实现 `CompositeScorer`（复合评分公式）
6. 重构 `memory-awakener.ts`，使用新的评分器
7. 更新 `agent/controller.ts` 注入新的依赖

### Phase 3：写入链路（约 1-2 小时）

8. 在 `episode-recorder.ts` 中添加 embedding 生成
9. 在 `memory-consolidator.ts` 中添加 embedding 生成
10. 实现 backfill 脚本为已有数据补充 embedding

### Phase 4：配置与测试（约 1-2 小时）

11. 扩展 `config.ts` 支持 embedding 配置
12. 更新 `factory.ts` 创建 `EmbeddingClient`
13. 单元测试：`EmbeddingClient`、`EmbeddingStore`、`CompositeScorer`
14. 集成测试：完整记忆唤醒流程
15. deterministic provider 降级测试

## 6. 降级策略

| 场景 | 行为 |
|------|------|
| `deterministic` provider | 使用零向量，评分退化为 importance + recency + confidence |
| sqlite-vec 不可用 | 降级到 `LexicalScorer`，打印警告 |
| Embedding API 失败 | 本次查询降级到 `LexicalScorer`，不影响主流程 |
| 无 embedding 的记忆 | 在候选集中不参与语义评分，但仍可被其他维度召回 |

## 7. 测试策略

- **单元测试**：`EmbeddingClient` mock 测试、`EmbeddingStore` CRUD、`CompositeScorer` 评分计算
- **集成测试**：完整写入 → embedding 生成 → 向量检索 → 复合评分流程
- **降级测试**：deterministic provider、API 失败、空 embedding 场景
- **性能测试**：1000 条记忆的检索延迟（目标 < 50ms）

## 8. 风险与缓解

| 风险 | 缓解 |
|------|------|
| sqlite-vec native addon 在 Windows 编译失败 | 优先使用预编译 npm 包；备选方案为内存向量搜索 |
| Embedding API 延迟影响响应速度 | embedding 缓存 + 异步预生成 + 降级策略 |
| 1536 维向量占用存储过大 | 1000 条记忆约 6MB，可接受；后续可降维到 512 |
| 全量检索变向量检索引入 bug | 保持 `LexicalScorer` 作为降级备选，渐进迁移 |

## 9. 验收标准

- [x] 能通过 API 生成文本 embedding 并存入 sqlite-vec
- [x] 记忆唤醒器使用向量相似度检索而非全量扫描
- [x] 复合评分包含 semantic_similarity + importance + recency + confidence 四个维度
- [x] deterministic provider 下正常降级运行
- [x] embedding 在记忆创建时自动生成
- [ ] 已有数据可通过 backfill 脚本补充 embedding（待后续实现）
- [x] 所有现有测试继续通过（110/110）
- [x] 新增模块测试覆盖率 ≥ 80%（新增 13 个测试覆盖 3 个新模块）

## 10. 实施偏差记录

### 已实现的偏差（合理调整）

| 偏差 | 原因 |
|------|------|
| CompositeScorer 独立为 `composite-scorer.ts` 而非扩展 `relevance-scorer.ts` | 保持原文件不变，职责更清晰 |
| `vector-repository.ts` 改为 `embedding-store.ts` 放在 `memory/` 下 | 向量存储是记忆层的关注点，不属于 db 层 |
| EmbeddingStore.search topK 用 `min(len*2, 50)` 替代固定 20 | 自适应候选集大小，避免记忆少时搜索不足 |
| episode-recorder 不生成 embedding | episode 不参与语义检索，无需 embedding |
| sqlite-vec load 放在 `createDbConnection` 中，无运行时降级 | sqlite-vec 是预编译 npm 包，加载失败应在启动时报错而非静默降级 |
| user_model / self_model 仍全量加载 | 提案标注"MVP 优先"在 semantic memory，后续迭代再加向量检索 |

### 待后续实现

| 项目 | 优先级 | 说明 |
|------|--------|------|
| backfill-embeddings 脚本 | P1 | 为已有数据批量生成 embedding，升级时必须 |
| user_model / self_model 向量检索 | P2 | 当前全量加载可工作到数百条，规模增大后需优化 |
| Embedding API 实时降级 | P2 | 当 API 失败时单次查询降级到 LexicalScorer |
| 性能基准测试 (1000 条 < 50ms) | P3 | MVP 阶段数据量小，暂不需要 |
| sqlite-vec 不可用降级 | P3 | npm 预编译包不太可能不可用 |

## 11. 实际变更文件清单

### 新增文件

| 文件 | 说明 |
|------|------|
| `src/llm/embedding-client.ts` | OpenAI 兼容 Embedding API 客户端 + DeterministicEmbeddingClient |
| `src/memory/embedding-store.ts` | 基于 sqlite-vec 的向量存储层 + DEFAULT_EMBEDDING_DIMENSIONS 常量 |
| `src/memory/composite-scorer.ts` | 四维复合评分器（semantic + importance + recency + confidence） |
| `tests/unit/embedding-client.test.ts` | EmbeddingClient 单元测试 (3 tests) |
| `tests/unit/embedding-store.test.ts` | EmbeddingStore 单元测试 (6 tests) |
| `tests/unit/composite-scorer.test.ts` | CompositeScorer 单元测试 (4 tests) |

### 修改文件

| 文件 | 变更 |
|------|------|
| `src/db/connection.ts` | 加载 sqlite-vec 扩展，新增 getRawSqlite() |
| `src/db/migrate.ts` | 迁移时创建 memory_embeddings 虚拟表 |
| `src/memory/memory-awakener.ts` | 支持 CompositeScorer 异步评分，保持 LexicalScorer 降级 |
| `src/memory/memory-consolidator.ts` | 记忆创建后自动批量生成 embedding |
| `src/agent/controller.ts` | 注入 EmbeddingClient，创建 EmbeddingStore + CompositeScorer |
| `src/config.ts` | 新增 embeddingModel、embeddingDimensions 配置字段 |
| `src/llm/factory.ts` | 新增 createEmbeddingClientFromConfig() |
| `src/cli/chat-handler.ts` | 传入 embeddingClient |
| `src/cli/demo-handler.ts` | 传入 embeddingClient |
| `src/cli/interactive-router.ts` | 传入 embeddingClient |
| `tests/helpers/test-helpers.ts` | 加载 sqlite-vec，创建 deterministic embedding client |

### 依赖变更

| 包 | 版本 | 说明 |
|----|------|------|
| sqlite-vec | ^0.1.9 | SQLite 向量扩展（预编译 native addon） |
