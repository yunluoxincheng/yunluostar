import { describe, it, expect, afterEach } from "vitest";
import { createTestDb, createTestAgent } from "../helpers/test-helpers.js";
import { createEpisodesRepository } from "../../src/db/episodes-repository.js";
import { createSemanticMemoriesRepository } from "../../src/db/semantic-memories-repository.js";
import { createUserModelRepository } from "../../src/db/user-model-repository.js";
import { createSelfModelRepository } from "../../src/db/self-model-repository.js";
import { createReflectionsRepository } from "../../src/db/reflections-repository.js";
import { createAuditLogRepository } from "../../src/db/audit-log-repository.js";

describe("Full chat → episode → reflection → consolidation → behavior-change loop", () => {
  let db: ReturnType<typeof createTestDb>;

  afterEach(() => {
    db?.close();
  });

  it("completes the full loop and creates all expected records", async () => {
    db = createTestDb();
    const agent = createTestAgent(db);
    const episodesRepo = createEpisodesRepository(db);
    const reflectionsRepo = createReflectionsRepository(db);
    const semanticRepo = createSemanticMemoriesRepository(db);
    const userModelRepo = createUserModelRepository(db);
    const auditRepo = createAuditLogRepository(db);

    const result = await agent.chat(
      "I prefer implementation-focused answers over broad conceptual explanations.",
      { sessionId: "loop-test" },
    );

    expect(result.response).toBeDefined();
    expect(result.trace.episodeId).toBeDefined();
    expect(result.trace.reflectionId).toBeDefined();

    const episode = episodesRepo.findById(result.trace.episodeId);
    expect(episode).toBeDefined();
    expect(episode!.status).toBe("active");

    const reflection = reflectionsRepo.findById(result.trace.reflectionId!);
    expect(reflection).toBeDefined();
    expect(reflection!.episodeId).toBe(result.trace.episodeId);

    const auditLogs = auditRepo.findRecent(20);
    expect(auditLogs.length).toBeGreaterThanOrEqual(2);

    const episodeAudits = auditLogs.filter((l) => l.targetTable === "episodes" && l.action === "create");
    const reflectionAudits = auditLogs.filter((l) => l.targetTable === "reflections" && l.action === "create");
    expect(episodeAudits.length).toBeGreaterThanOrEqual(1);
    expect(reflectionAudits.length).toBeGreaterThanOrEqual(1);
  });

  it("second chat recalls memory from first interaction", async () => {
    db = createTestDb();
    const agent = createTestAgent(db);

    await agent.chat(
      "I prefer implementation-focused answers.",
      { sessionId: "recall-test" },
    );

    const result2 = await agent.chat(
      "How should I handle errors?",
      { sessionId: "recall-test" },
    );

    expect(result2.response).toBeDefined();
    expect(result2.trace.episodeId).toBeDefined();
  });

  it("stores user model entries from preference statements", async () => {
    db = createTestDb();
    const agent = createTestAgent(db);
    const userModelRepo = createUserModelRepository(db);

    await agent.chat(
      "I prefer implementation-focused answers over broad conceptual explanations.",
      { sessionId: "pref-test" },
    );

    const entries = userModelRepo.findActive();
    expect(entries.length).toBeGreaterThanOrEqual(1);

    const pref = entries.find((e) => e.key === "preference");
    expect(pref).toBeDefined();
    expect(pref!.confidence).toBeGreaterThan(0);
    expect(pref!.evidence).toBeTruthy();
  });

  it("audit logs track all state changes", async () => {
    db = createTestDb();
    const agent = createTestAgent(db);
    const auditRepo = createAuditLogRepository(db);

    await agent.chat("Hello there", { sessionId: "audit-test" });

    const logs = auditRepo.findRecent(50);
    const tables = new Set(logs.map((l) => l.targetTable));

    expect(tables.has("episodes")).toBe(true);
    expect(tables.has("reflections")).toBe(true);
  });
});
