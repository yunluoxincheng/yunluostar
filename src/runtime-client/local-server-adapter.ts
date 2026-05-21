import type { AppConfig } from "../config.js";
import { createRuntimeHttpServer } from "../runtime/server.js";

export function createLocalRuntimeServer(config: AppConfig) {
  return createRuntimeHttpServer(config);
}
