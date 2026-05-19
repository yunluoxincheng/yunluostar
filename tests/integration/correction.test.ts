import { describe, it, expect, afterEach } from "vitest";
import { createTestDb, createTestAgent } from "../helpers/test-helpers.js";
import { createUserModelRepository } from "../../src/db/user-model-repository.js";
import { createSemanticMemoriesRepository } from "../../src/db/semantic-memories-repository.js";
import { createAuditLogRepository } from "../../src/db/audit-log-repository.js";

describe("Preference correction, supersession, and audit logging", () => {
  let db: ReturnType<typeof createTestDb>;

  afterEach(() => {
    db?.close();
  });

  it("stores initial preference and then supersedes it when corrected", async () => {
    db = createTestDb();
    const agent = createTestAgent(db);
    const userModelRepo = createUserModelRepository(db);

    await agent.chat(
      "I prefer implementation-focused answers.",
      { sessionId: "correction-test" },
    );

    const firstEntries = userModelRepo.findActive();
    expect(firstEntries.length).toBeGreaterThanOrEqual(1);
    const oldId = firstEntries[0].id;

    await agent.chat(
      "Actually, I prefer practical code examples, not just explanations.",
      { sessionId: "correction-test" },
    );

    const oldEntry = userModelRepo.findById(oldId);
    expect(oldEntry!.status).toBe("superseded");
    expect(oldEntry!.supersededBy).toBeDefined();

    const newEntries = userModelRepo.findActive().filter((e) => e.key === "preference");
    expect(newEntries.length).toBe(1);
    expect(newEntries[0].id).not.toBe(oldId);
    expect(oldEntry!.supersededBy).toBe(newEntries[0].id);
  });

  it("audit logs record supersede actions for corrected preferences", async () => {
    db = createTestDb();
    const agent = createTestAgent(db);
    const auditRepo = createAuditLogRepository(db);
    const userModelRepo = createUserModelRepository(db);

    await agent.chat(
      "I prefer implementation-focused answers.",
      { sessionId: "audit-correction-test" },
    );

    const firstEntries = userModelRepo.findActive();
    expect(firstEntries.length).toBeGreaterThanOrEqual(1);

    await agent.chat(
      "Actually I prefer code examples.",
      { sessionId: "audit-correction-test" },
    );

    const supersedeAudits = auditRepo.findRecent(100).filter(
      (a) => a.action === "supersede" && a.targetTable === "user_model",
    );
    expect(supersedeAudits.length).toBeGreaterThanOrEqual(1);
    expect(supersedeAudits[0].reason).toContain("Superseded");
  });

  it("correction handler properly deprecates old entries", async () => {
    db = createTestDb();
    const semanticRepo = createSemanticMemoriesRepository(db);
    const userModelRepo = createUserModelRepository(db);
    const auditRepo = createAuditLogRepository(db);
    const { applyCorrection } = await import("../../src/memory/correction-handler.js");
    const selfModelRepo = (await import("../../src/db/self-model-repository.js")).createSelfModelRepository(db);

    userModelRepo.insert({
      id: "um-old", key: "preference", value: "conceptual answers",
      evidence: "User said so", confidence: 0.7,
      status: "active", supersededBy: null, sourceEpisodeId: null,
      createdAt: new Date(), updatedAt: new Date(),
    });

    userModelRepo.insert({
      id: "um-new", key: "preference", value: "code examples",
      evidence: "User corrected", confidence: 0.8,
      status: "active", supersededBy: null, sourceEpisodeId: null,
      createdAt: new Date(), updatedAt: new Date(),
    });

    await applyCorrection(
      semanticRepo, userModelRepo, selfModelRepo, auditRepo,
      { table: "user_model", oldId: "um-old", newId: "um-new", reason: "User corrected preference" },
    );

    const oldEntry = userModelRepo.findById("um-old");
    expect(oldEntry!.status).toBe("superseded");
    expect(oldEntry!.supersededBy).toBe("um-new");

    const newEntry = userModelRepo.findById("um-new");
    expect(newEntry!.status).toBe("active");

    const audits = auditRepo.findByTarget("user_model", "um-old");
    const supersedAction = audits.find((a) => a.action === "supersede");
    expect(supersedAction).toBeDefined();
    expect(supersedAction!.reason).toBe("User corrected preference");
  });

  it("lowerConfidence deprecates entries with audit trail", async () => {
    db = createTestDb();
    const semanticRepo = createSemanticMemoriesRepository(db);
    const userModelRepo = createUserModelRepository(db);
    const selfModelRepo = (await import("../../src/db/self-model-repository.js")).createSelfModelRepository(db);
    const auditRepo = createAuditLogRepository(db);
    const { lowerConfidence } = await import("../../src/memory/correction-handler.js");

    semanticRepo.insert({
      id: "mem-wrong", sourceEpisodeId: null,
      content: "Incorrect fact", category: "general",
      importance: 0.5, confidence: 0.7, status: "active",
      supersededBy: null, createdAt: new Date(), updatedAt: new Date(),
    });

    await lowerConfidence(
      semanticRepo, userModelRepo, selfModelRepo, auditRepo,
      "semantic_memories", "mem-wrong", "User identified as incorrect",
    );

    const mem = semanticRepo.findById("mem-wrong");
    expect(mem!.status).toBe("deprecated");

    const audits = auditRepo.findByTarget("semantic_memories", "mem-wrong");
    const lowerAction = audits.find((a) => a.action === "confidence_lower");
    expect(lowerAction).toBeDefined();
    expect(lowerAction!.reason).toBe("User identified as incorrect");
  });
});
