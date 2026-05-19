import { describe, it, expect, afterEach } from "vitest";
import { createTestDb } from "../helpers/test-helpers.js";
import { createEpisodesRepository } from "../../src/db/episodes-repository.js";
import { createSemanticMemoriesRepository } from "../../src/db/semantic-memories-repository.js";
import { createUserModelRepository } from "../../src/db/user-model-repository.js";
import { createSelfModelRepository } from "../../src/db/self-model-repository.js";
import { createGoalsRepository } from "../../src/db/goals-repository.js";
import { createReflectionsRepository } from "../../src/db/reflections-repository.js";
import { createAuditLogRepository } from "../../src/db/audit-log-repository.js";

describe("Repository persistence", () => {
  let db: ReturnType<typeof createTestDb>;

  afterEach(() => {
    db?.close();
  });

  describe("EpisodesRepository", () => {
    it("inserts and retrieves an episode", () => {
      db = createTestDb();
      const repo = createEpisodesRepository(db);

      const episode = {
        id: "ep-1",
        sessionId: "s-1",
        timestamp: new Date(),
        userInput: "Hello",
        agentResponse: "Hi there",
        intent: "greeting",
        action: "responded",
        outcome: "delivered",
        lesson: "User greeted",
        importance: 0.5,
        confidence: 0.5,
        status: "active" as const,
        supersededBy: null,
        createdAt: new Date(),
      };

      const inserted = repo.insert(episode);
      expect(inserted.id).toBe("ep-1");

      const found = repo.findById("ep-1");
      expect(found).toBeDefined();
      expect(found!.userInput).toBe("Hello");
      expect(found!.sessionId).toBe("s-1");
    });

    it("finds episodes by session", () => {
      db = createTestDb();
      const repo = createEpisodesRepository(db);

      repo.insert({
        id: "ep-1", sessionId: "s-1", timestamp: new Date(),
        userInput: "Hi", agentResponse: "Hello",
        intent: null, action: null, outcome: null, lesson: null,
        importance: 0.5, confidence: 0.5, status: "active", supersededBy: null, createdAt: new Date(),
      });
      repo.insert({
        id: "ep-2", sessionId: "s-2", timestamp: new Date(),
        userInput: "Bye", agentResponse: "Goodbye",
        intent: null, action: null, outcome: null, lesson: null,
        importance: 0.5, confidence: 0.5, status: "active", supersededBy: null, createdAt: new Date(),
      });

      const s1 = repo.findBySession("s-1");
      expect(s1).toHaveLength(1);
      expect(s1[0].id).toBe("ep-1");
    });

    it("updates episode status with supersession", () => {
      db = createTestDb();
      const repo = createEpisodesRepository(db);

      repo.insert({
        id: "ep-1", sessionId: "s-1", timestamp: new Date(),
        userInput: "Hi", agentResponse: "Hello",
        intent: null, action: null, outcome: null, lesson: null,
        importance: 0.5, confidence: 0.5, status: "active", supersededBy: null, createdAt: new Date(),
      });

      const updated = repo.updateStatus("ep-1", "superseded", "ep-2");
      expect(updated.status).toBe("superseded");
      expect(updated.supersededBy).toBe("ep-2");
    });
  });

  describe("SemanticMemoriesRepository", () => {
    it("inserts and finds semantic memories", () => {
      db = createTestDb();
      const repo = createSemanticMemoriesRepository(db);

      repo.insert({
        id: "mem-1", sourceEpisodeId: null,
        content: "User prefers TypeScript", category: "preference",
        importance: 0.8, confidence: 0.9, status: "active",
        supersededBy: null, createdAt: new Date(), updatedAt: new Date(),
      });

      const found = repo.findById("mem-1");
      expect(found).toBeDefined();
      expect(found!.content).toBe("User prefers TypeScript");
    });

    it("filters active memories by confidence", () => {
      db = createTestDb();
      const repo = createSemanticMemoriesRepository(db);

      repo.insert({
        id: "mem-1", sourceEpisodeId: null,
        content: "High confidence", category: null,
        importance: 0.8, confidence: 0.9, status: "active",
        supersededBy: null, createdAt: new Date(), updatedAt: new Date(),
      });
      repo.insert({
        id: "mem-2", sourceEpisodeId: null,
        content: "Low confidence", category: null,
        importance: 0.3, confidence: 0.2, status: "active",
        supersededBy: null, createdAt: new Date(), updatedAt: new Date(),
      });

      const high = repo.findActiveByConfidence(0.5);
      expect(high).toHaveLength(1);
      expect(high[0].id).toBe("mem-1");
    });
  });

  describe("UserModelRepository", () => {
    it("inserts and finds by key", () => {
      db = createTestDb();
      const repo = createUserModelRepository(db);

      repo.insert({
        id: "um-1", key: "preference", value: "implementation-focused",
        evidence: "User stated preference", confidence: 0.8,
        status: "active", supersededBy: null, sourceEpisodeId: null,
        createdAt: new Date(), updatedAt: new Date(),
      });

      const entries = repo.findByKey("preference");
      expect(entries).toHaveLength(1);
      expect(entries[0].value).toBe("implementation-focused");
    });
  });

  describe("SelfModelRepository", () => {
    it("inserts and finds by trait", () => {
      db = createTestDb();
      const repo = createSelfModelRepository(db);

      repo.insert({
        id: "sm-1", trait: "communication_style", value: "concise",
        evidence: "Users respond positively to brief answers", confidence: 0.7,
        mutable: true, status: "active", supersededBy: null,
        sourceEpisodeId: null, createdAt: new Date(), updatedAt: new Date(),
      });

      const entries = repo.findByTrait("communication_style");
      expect(entries).toHaveLength(1);
      expect(entries[0].value).toBe("concise");
    });
  });

  describe("GoalsRepository", () => {
    it("inserts and finds active goals", () => {
      db = createTestDb();
      const repo = createGoalsRepository(db);

      repo.insert({
        id: "g-1", description: "Be helpful", priority: 0.9,
        status: "active", createdAt: new Date(), updatedAt: new Date(),
      });

      const goals = repo.findActive();
      expect(goals).toHaveLength(1);
      expect(goals[0].description).toBe("Be helpful");
    });
  });

  describe("AuditLogRepository", () => {
    it("records audit entries and finds by target", () => {
      db = createTestDb();
      const repo = createAuditLogRepository(db);

      repo.insert({
        id: "al-1", targetTable: "episodes", targetId: "ep-1",
        action: "create", beforeValue: null,
        afterValue: JSON.stringify({ intent: "greeting" }),
        reason: "Episode created", timestamp: new Date(),
      });

      const logs = repo.findByTarget("episodes", "ep-1");
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe("create");
    });
  });
});
