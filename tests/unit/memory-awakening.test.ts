import { describe, it, expect, afterEach } from "vitest";
import { createTestDb } from "../helpers/test-helpers.js";
import { createLexicalScorer } from "../../src/memory/relevance-scorer.js";
import { awakenMemories } from "../../src/memory/memory-awakener.js";
import { createSemanticMemoriesRepository } from "../../src/db/semantic-memories-repository.js";
import { createUserModelRepository } from "../../src/db/user-model-repository.js";
import { createSelfModelRepository } from "../../src/db/self-model-repository.js";

describe("Memory awakening", () => {
  let db: ReturnType<typeof createTestDb>;

  afterEach(() => {
    db?.close();
  });

  it("returns relevant memories based on lexical scoring", async () => {
    db = createTestDb();
    const semanticRepo = createSemanticMemoriesRepository(db);
    const userModelRepo = createUserModelRepository(db);
    const selfModelRepo = createSelfModelRepository(db);
    const scorer = createLexicalScorer();

    semanticRepo.insert({
      id: "mem-1", sourceEpisodeId: null,
      content: "User prefers implementation-focused answers",
      category: "preference", importance: 0.8, confidence: 0.9,
      status: "active", supersededBy: null,
      createdAt: new Date(), updatedAt: new Date(),
    });
    semanticRepo.insert({
      id: "mem-2", sourceEpisodeId: null,
      content: "Weather is sunny today",
      category: "general", importance: 0.3, confidence: 0.5,
      status: "active", supersededBy: null,
      createdAt: new Date(), updatedAt: new Date(),
    });

    const result = await awakenMemories(
      "How should I implement error handling?",
      semanticRepo, userModelRepo, selfModelRepo, scorer,
    );

    expect(result.recalledMemories.length).toBeGreaterThanOrEqual(1);
    expect(result.recalledMemories[0].id).toBe("mem-1");
  });

  it("excludes low-confidence memories from strong influence", async () => {
    db = createTestDb();
    const semanticRepo = createSemanticMemoriesRepository(db);
    const userModelRepo = createUserModelRepository(db);
    const selfModelRepo = createSelfModelRepository(db);
    const scorer = createLexicalScorer();

    semanticRepo.insert({
      id: "mem-low", sourceEpisodeId: null,
      content: "User prefers implementation answers",
      category: "preference", importance: 0.5, confidence: 0.2,
      status: "active", supersededBy: null,
      createdAt: new Date(), updatedAt: new Date(),
    });

    const result = await awakenMemories(
      "How should I implement error handling?",
      semanticRepo, userModelRepo, selfModelRepo, scorer,
    );

    const lowConfMem = result.recalledMemories.find((m) => m.id === "mem-low");
    expect(lowConfMem).toBeUndefined();
  });

  it("excludes deprecated memories", async () => {
    db = createTestDb();
    const semanticRepo = createSemanticMemoriesRepository(db);
    const userModelRepo = createUserModelRepository(db);
    const selfModelRepo = createSelfModelRepository(db);
    const scorer = createLexicalScorer();

    semanticRepo.insert({
      id: "mem-dep", sourceEpisodeId: null,
      content: "User prefers implementation answers",
      category: "preference", importance: 0.8, confidence: 0.9,
      status: "deprecated", supersededBy: null,
      createdAt: new Date(), updatedAt: new Date(),
    });

    const result = await awakenMemories(
      "How should I implement error handling?",
      semanticRepo, userModelRepo, selfModelRepo, scorer,
    );

    const deprecated = result.recalledMemories.find((m) => m.id === "mem-dep");
    expect(deprecated).toBeUndefined();
  });

  it("returns user model entries above confidence threshold", async () => {
    db = createTestDb();
    const semanticRepo = createSemanticMemoriesRepository(db);
    const userModelRepo = createUserModelRepository(db);
    const selfModelRepo = createSelfModelRepository(db);
    const scorer = createLexicalScorer();

    userModelRepo.insert({
      id: "um-1", key: "preference", value: "implementation-focused",
      evidence: "User stated", confidence: 0.8,
      status: "active", supersededBy: null, sourceEpisodeId: null,
      createdAt: new Date(), updatedAt: new Date(),
    });
    userModelRepo.insert({
      id: "um-2", key: "preference", value: "low-conf entry",
      evidence: "Unclear", confidence: 0.2,
      status: "active", supersededBy: null, sourceEpisodeId: null,
      createdAt: new Date(), updatedAt: new Date(),
    });

    const result = await awakenMemories(
      "Tell me about errors",
      semanticRepo, userModelRepo, selfModelRepo, scorer,
    );

    expect(result.userModelEntries).toHaveLength(1);
    expect(result.userModelEntries[0].id).toBe("um-1");
  });
});

describe("Lexical scorer", () => {
  it("scores overlapping tokens higher", () => {
    const scorer = createLexicalScorer();
    const result = scorer.score("error handling implementation", [
      { id: "1", content: "User prefers implementation-focused answers" },
      { id: "2", content: "Weather is sunny" },
    ]);

    expect(result[0].id).toBe("1");
    expect(result[0].score).toBeGreaterThan(result[1].score);
  });

  it("returns zero score for unrelated content", () => {
    const scorer = createLexicalScorer();
    const result = scorer.score("database migration", [
      { id: "1", content: "weather forecast" },
    ]);

    expect(result[0].score).toBe(0);
  });
});
