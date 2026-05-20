import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { createTestDb } from "../helpers/test-helpers.js";
import { generateId } from "../../src/models/defaults.js";
import { createEpisodesRepository } from "../../src/db/episodes-repository.js";
import { createSemanticMemoriesRepository } from "../../src/db/semantic-memories-repository.js";
import { createUserModelRepository } from "../../src/db/user-model-repository.js";
import { createSelfModelRepository } from "../../src/db/self-model-repository.js";
import { createGoalsRepository } from "../../src/db/goals-repository.js";
import { createReflectionsRepository } from "../../src/db/reflections-repository.js";
import { createAuditLogRepository } from "../../src/db/audit-log-repository.js";
import { createWorkingMemoryRepository } from "../../src/db/working-memory-repository.js";

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

    it("inserts a classified goal with type and defaults", () => {
      db = createTestDb();
      const repo = createGoalsRepository(db);

      const goal = repo.insert({
        id: "g-core-1", description: "Safety", type: "core",
        priority: 1.0, status: "active", mutable: false,
        requiresApproval: false, approvedAt: null,
        sourceEpisodeId: null, evidence: null, rationale: "Core safety goal",
        conflictOf: null, createdAt: new Date(), updatedAt: new Date(),
      });

      expect(goal.type).toBe("core");
      expect(goal.mutable).toBe(false);
      expect(goal.requiresApproval).toBe(false);
      expect(goal.conflictOf).toBeNull();
    });

    it("backfills defaults for existing-style insert", () => {
      db = createTestDb();
      const repo = createGoalsRepository(db);

      const goal = repo.insert({
        id: "g-1", description: "Learn TypeScript",
        priority: 0.5, status: "active",
        createdAt: new Date(), updatedAt: new Date(),
      });

      expect(goal.type).toBe("long_term");
      expect(goal.mutable).toBe(true);
      expect(goal.requiresApproval).toBe(false);
    });

    it("finds goals by type", () => {
      db = createTestDb();
      const repo = createGoalsRepository(db);

      repo.insert({
        id: "g-1", description: "Safety", type: "core",
        priority: 1.0, status: "active",
        createdAt: new Date(), updatedAt: new Date(),
      });
      repo.insert({
        id: "g-2", description: "Learn", type: "long_term",
        priority: 0.7, status: "active",
        createdAt: new Date(), updatedAt: new Date(),
      });

      const core = repo.findByType("core");
      expect(core).toHaveLength(1);
      expect(core[0].id).toBe("g-1");
    });

    it("finds goals by status", () => {
      db = createTestDb();
      const repo = createGoalsRepository(db);

      repo.insert({
        id: "g-1", description: "Suggested", type: "medium_term",
        priority: 0.6, status: "suggested",
        createdAt: new Date(), updatedAt: new Date(),
      });
      repo.insert({
        id: "g-2", description: "Active", type: "short_term",
        priority: 0.7, status: "active",
        createdAt: new Date(), updatedAt: new Date(),
      });

      const suggested = repo.findByStatus("suggested");
      expect(suggested).toHaveLength(1);
      expect(suggested[0].id).toBe("g-1");
    });

    it("finds active ranked goals excluding conflicted ones", () => {
      db = createTestDb();
      const repo = createGoalsRepository(db);

      repo.insert({
        id: "g-1", description: "High priority", type: "short_term",
        priority: 0.9, status: "active", conflictOf: null,
        createdAt: new Date(), updatedAt: new Date(),
      });
      repo.insert({
        id: "g-2", description: "Conflicted", type: "short_term",
        priority: 0.8, status: "active", conflictOf: "g-1",
        createdAt: new Date(), updatedAt: new Date(),
      });
      repo.insert({
        id: "g-3", description: "Low priority", type: "operational",
        priority: 0.3, status: "active", conflictOf: null,
        createdAt: new Date(), updatedAt: new Date(),
      });

      const ranked = repo.findActiveRanked();
      expect(ranked).toHaveLength(2);
      expect(ranked[0].id).toBe("g-1");
      expect(ranked[1].id).toBe("g-3");
    });

    it("updates goal status", () => {
      db = createTestDb();
      const repo = createGoalsRepository(db);

      repo.insert({
        id: "g-1", description: "Goal", type: "short_term",
        priority: 0.5, status: "suggested",
        createdAt: new Date(), updatedAt: new Date(),
      });

      const updated = repo.updateStatus("g-1", "active");
      expect(updated.status).toBe("active");
    });

    it("updates goal priority", () => {
      db = createTestDb();
      const repo = createGoalsRepository(db);

      repo.insert({
        id: "g-1", description: "Goal", type: "short_term",
        priority: 0.5, status: "active",
        createdAt: new Date(), updatedAt: new Date(),
      });

      const updated = repo.updatePriority("g-1", 0.9);
      expect(updated.priority).toBe(0.9);
    });

    it("updates conflict metadata", () => {
      db = createTestDb();
      const repo = createGoalsRepository(db);

      repo.insert({
        id: "g-1", description: "Goal", type: "short_term",
        priority: 0.5, status: "active", conflictOf: null,
        createdAt: new Date(), updatedAt: new Date(),
      });

      const updated = repo.updateConflictOf("g-1", "g-2");
      expect(updated.conflictOf).toBe("g-2");
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
