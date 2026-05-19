import { describe, it, expect, vi } from "vitest";
import { InteractiveRouter } from "../../src/cli/interactive-router.js";
import type { AppConfig } from "../../src/config.js";

const testConfig: AppConfig = {
  provider: "deterministic",
  defaultSessionId: "default",
  databasePath: "data/yunluostar.db",
};

function makeRouter(sessionId?: string) {
  return new InteractiveRouter(testConfig, sessionId);
}

describe("InteractiveRouter", () => {
  describe("slash command routing", () => {
    it("/help returns help text", async () => {
      const router = makeRouter();
      const result = await router.route("/help");
      expect(result.action).toBe("continue");
      expect(result.output).toContain("/help");
      expect(result.output).toContain("/exit");
    });

    it("/exit returns exit action", async () => {
      const router = makeRouter();
      const result = await router.route("/exit");
      expect(result.action).toBe("exit");
    });

    it("/quit returns exit action", async () => {
      const router = makeRouter();
      const result = await router.route("/quit");
      expect(result.action).toBe("exit");
    });

    it("/config shows redacted config", async () => {
      const router = makeRouter();
      const result = await router.route("/config");
      expect(result.action).toBe("continue");
      expect(result.output).toContain("deterministic");
    });

    it("/model shows provider summary", async () => {
      const router = makeRouter();
      const result = await router.route("/model");
      expect(result.action).toBe("continue");
      expect(result.output).toContain("provider");
      expect(result.output).toContain("deterministic");
    });

    it("/session without args shows current session", async () => {
      const router = makeRouter();
      const result = await router.route("/session");
      expect(result.action).toBe("continue");
      expect(result.output).toContain("default");
    });

    it("/session <id> switches session", async () => {
      const router = makeRouter();
      const result = await router.route("/session test-session-123");
      expect(result.action).toBe("continue");
      expect(result.output).toContain("test-session-123");
      expect(router.getSessionId()).toBe("test-session-123");
    });

    it("unknown slash command returns error", async () => {
      const router = makeRouter();
      const result = await router.route("/unknown");
      expect(result.action).toBe("error");
      expect(result.output).toContain("Unknown command");
    });
  });

  describe("chat routing", () => {
    it("plain text routes to chat action", async () => {
      const router = makeRouter();
      const result = await router.route("Hello agent!");
      expect(result.action).toBe("chat");
      expect(result.output).toBe("Hello agent!");
    });

    it("whitespace-only input is ignored", async () => {
      const router = makeRouter();
      const result = await router.route("   ");
      expect(result.action).toBe("continue");
      expect(result.output).toBeUndefined();
    });

    it("empty input is ignored", async () => {
      const router = makeRouter();
      const result = await router.route("");
      expect(result.action).toBe("continue");
      expect(result.output).toBeUndefined();
    });
  });

  describe("session management", () => {
    it("default session from config", () => {
      const router = makeRouter();
      expect(router.getSessionId()).toBe("default");
    });

    it("custom initial session", () => {
      const router = makeRouter("my-session");
      expect(router.getSessionId()).toBe("my-session");
    });

    it("session persists across multiple commands", async () => {
      const router = makeRouter();
      await router.route("/session new-session");
      await router.route("/help");
      expect(router.getSessionId()).toBe("new-session");
    });
  });

  describe("read-only inspection commands", () => {
    it("/memory returns read-only result", async () => {
      const router = makeRouter();
      const result = await router.route("/memory");
      expect(result.action).toBe("continue");
      expect(result.output).toBeDefined();
    });

    it("/self returns read-only result", async () => {
      const router = makeRouter();
      const result = await router.route("/self");
      expect(result.action).toBe("continue");
      expect(result.output).toBeDefined();
    });

    it("/goals returns read-only result", async () => {
      const router = makeRouter();
      const result = await router.route("/goals");
      expect(result.action).toBe("continue");
      expect(result.output).toBeDefined();
    });

    it("/reflections returns read-only result", async () => {
      const router = makeRouter();
      const result = await router.route("/reflections");
      expect(result.action).toBe("continue");
      expect(result.output).toBeDefined();
    });
  });
});
