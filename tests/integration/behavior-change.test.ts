import { describe, it, expect, afterEach } from "vitest";
import { createTestDb, createTestAgent } from "../helpers/test-helpers.js";
import { createSemanticMemoriesRepository } from "../../src/db/semantic-memories-repository.js";
import { createUserModelRepository } from "../../src/db/user-model-repository.js";
import { createSelfModelRepository } from "../../src/db/self-model-repository.js";
import { createReflectionsRepository } from "../../src/db/reflections-repository.js";
import { createEpisodesRepository } from "../../src/db/episodes-repository.js";
import { createAuditLogRepository } from "../../src/db/audit-log-repository.js";

describe("Behavior change acceptance path", () => {
  let db: ReturnType<typeof createTestDb>;

  afterEach(() => {
    db?.close();
  });

  it("7.1 - stores a user preference for implementation-focused answers", async () => {
    db = createTestDb();
    const agent = createTestAgent(db);

    const result = await agent.chat(
      "I prefer implementation-focused answers over broad conceptual explanations.",
      { sessionId: "test-session" },
    );

    expect(result.response).toBeDefined();
    expect(result.trace.episodeId).toBeDefined();
  });

  it("7.2 - verifies the preference is stored in user model with evidence and confidence", async () => {
    db = createTestDb();
    const agent = createTestAgent(db);
    const userModelRepo = createUserModelRepository(db);

    await agent.chat(
      "I prefer implementation-focused answers over broad conceptual explanations.",
      { sessionId: "test-session" },
    );

    const entries = userModelRepo.findActive();
    expect(entries.length).toBeGreaterThanOrEqual(1);

    const preference = entries.find((e) =>
      e.value.toLowerCase().includes("implementation") ||
      e.evidence.toLowerCase().includes("prefer"),
    );
    expect(preference).toBeDefined();
    expect(preference!.confidence).toBeGreaterThan(0);
    expect(preference!.evidence).toBeTruthy();
  });

  it("7.3 - verifies a later related chat response uses the stored preference", async () => {
    db = createTestDb();
    const agent = createTestAgent(db);

    await agent.chat(
      "I prefer implementation-focused answers over broad conceptual explanations.",
      { sessionId: "test-session" },
    );

    const result = await agent.chat(
      "How should I handle errors in my API?",
      { sessionId: "test-session" },
    );

    expect(result.response).toBeDefined();
    expect(result.trace.recalledMemoryIds.length + result.trace.appliedUserModelIds.length).toBeGreaterThan(0);
  });

  it("7.4 - corrects an outdated stored preference by deprecation/supersession", async () => {
    db = createTestDb();
    const agent = createTestAgent(db);
    const userModelRepo = createUserModelRepository(db);

    await agent.chat(
      "I prefer implementation-focused answers.",
      { sessionId: "test-session" },
    );

    const firstEntries = userModelRepo.findActive();
    const oldId = firstEntries[0].id;

    await agent.chat(
      "Actually, I prefer practical code examples, not just explanations.",
      { sessionId: "test-session" },
    );

    const oldEntry = userModelRepo.findById(oldId);
    expect(oldEntry!.status).toBe("superseded");
    expect(oldEntry!.supersededBy).toBeDefined();

    const activePrefs = userModelRepo.findActive().filter((e) => e.key === "preference");
    expect(activePrefs.length).toBe(1);
    expect(activePrefs[0].id).not.toBe(oldId);
  });

  it("7.5 - verifies chat trace identifiers expose recalled memory/model entry", async () => {
    db = createTestDb();
    const agent = createTestAgent(db);

    await agent.chat(
      "I prefer implementation-focused answers.",
      { sessionId: "test-session" },
    );

    const result = await agent.chat(
      "How should I handle errors?",
      { sessionId: "test-session" },
    );

    expect(result.trace.episodeId).toBeDefined();
    expect(result.trace.reflectionId).toBeDefined();
    expect(
      result.trace.recalledMemoryIds.length +
      result.trace.appliedUserModelIds.length +
      result.trace.appliedSelfModelIds.length,
    ).toBeGreaterThan(0);
  });
});
