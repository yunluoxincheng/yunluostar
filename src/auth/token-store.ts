import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { z } from "zod";

const AUTH_DIR_NAME = ".yunluo";
const AUTH_FILENAME = "auth.json";

export const authFileSchema = z.object({
  runtimeUrl: z.string().url(),
  token: z.string().min(1),
  updatedAt: z.string(),
});

export type AuthFile = z.infer<typeof authFileSchema>;

export function getAuthFilePath(): string {
  return resolve(homedir(), AUTH_DIR_NAME, AUTH_FILENAME);
}

export function readAuthFile(filePath = getAuthFilePath()): AuthFile | null {
  if (!existsSync(filePath)) return null;
  try {
    return authFileSchema.parse(JSON.parse(readFileSync(filePath, "utf-8")));
  } catch {
    return null;
  }
}

export function writeAuthFile(auth: Omit<AuthFile, "updatedAt">, filePath = getAuthFilePath()): AuthFile {
  const payload: AuthFile = { ...auth, updatedAt: new Date().toISOString() };
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, JSON.stringify(payload, null, 2) + "\n", { encoding: "utf-8", mode: 0o600 });
  try {
    chmodSync(filePath, 0o600);
  } catch {
    // Best effort on platforms/filesystems that do not support POSIX file modes.
  }
  return payload;
}

export function clearAuthFile(filePath = getAuthFilePath()): boolean {
  if (!existsSync(filePath)) return false;
  rmSync(filePath);
  return true;
}
