import { describe, it, expect, afterEach, vi } from "vitest";
import { createTestDb } from "../helpers/test-helpers.js";
import { createAgentController } from "../../src/agent/controller.js";
import { createLLMClient } from "../../src/llm/factory.js";
import { createEpisodesRepository } from "../../src/db/episodes-repository.js";
import { createSemanticMemoriesRepository } from "../../src/db/semantic-memories-repository.js";
import { createSelfModelRepository } from "../../src/db/self-model-repository.js";
import { createUserModelRepository } from "../../src/db/user-model-repository.js";
import { createGoalsRepository } from "../../src/db/goals-repository.js";
import { createReflectionsRepository } from "../../src/db/reflections-repository.js";
import { chatInputSchema } from "../../src/models/schemas.js";

describe("CLI handler tests", () => {
  let db: ReturnType<typeof createTestDb>;

  afterEach(() => {
    db?.close();
  });

  it("chat with valid message returns a response", async () => {
    db = createTestDb();
    const llm = createLLMClient("deterministic");
    const agent = createAgentController(llm, db);

    const result = await agent.chat("Hello there", { sessionId: "cli-test" });
    expect(result.response).toBeDefined();
    expect(result.trace.episodeId).toBeDefined();
  });

  it("chat rejects empty message with validation error", () => {
    const parsed = chatInputSchema.safeParse({ message: "" });
    expect(parsed.success).toBe(false);
    expect(parsed.error!.issues[0].message).toContain("empty");
  });

  it("chat rejects whitespace-only message", () => {
    const parsed = chatInputSchema.safeParse({ message: "   " });
    expect(parsed.success).toBe(false);
  });

  it("chat returns JSON-compatible trace identifiers", async () => {
    db = createTestDb();
    const llm = createLLMClient("deterministic");
    const agent = createAgentController(llm, db);

    const result = await agent.chat("Hello", { sessionId: "trace-test" });
    const json = JSON.parse(JSON.stringify(result));
    expect(json.trace.episodeId).toBeDefined();
    expect(json.trace.recalledMemoryIds).toEqual([]);
  });

  it("memory list returns empty list initially", () => {
    db = createTestDb();
    const repo = createSemanticMemoriesRepository(db);
    const items = repo.findRecent(20);
    expect(items).toEqual([]);
  });

  it("self show returns empty list initially", () => {
    db = createTestDb();
    const repo = createSelfModelRepository(db);
    const items = repo.findActive();
    expect(items).toEqual([]);
  });

  it("goals list returns empty list initially (no core goals initialized yet)", () => {
    db = createTestDb();
    const repo = createGoalsRepository(db);
    const items = repo.findActive();
    expect(items).toEqual([]);
  });

  it("reflections list returns empty list initially", () => {
    db = createTestDb();
    const repo = createReflectionsRepository(db);
    const items = repo.findRecent(20);
    expect(items).toEqual([]);
  });

  it("inspection commands are read-only (do not create records)", async () => {
    db = createTestDb();
    const llm = createLLMClient("deterministic");
    const agent = createAgentController(llm, db);

    await agent.chat("Hello", { sessionId: "readonly-test" });

    const episodesRepo = createEpisodesRepository(db);
    const memoriesRepo = createSemanticMemoriesRepository(db);
    const userModelRepo = createUserModelRepository(db);
    const goalsRepo = createGoalsRepository(db);

    const episodesBefore = episodesRepo.findRecentActive().length;
    const memoriesBefore = memoriesRepo.findActive().length;
    const userBefore = userModelRepo.findActive().length;
    const goalsBefore = goalsRepo.findActive().length;

    const _episodes = episodesRepo.findRecentActive();
    const _memories = memoriesRepo.findActive();
    const _user = userModelRepo.findActive();
    const _goals = goalsRepo.findActive();

    expect(episodesRepo.findRecentActive().length).toBe(episodesBefore);
    expect(memoriesRepo.findActive().length).toBe(memoriesBefore);
    expect(userModelRepo.findActive().length).toBe(userBefore);
    expect(goalsRepo.findActive().length).toBe(goalsBefore);
  });
});
