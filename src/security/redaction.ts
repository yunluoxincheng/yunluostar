const SECRET_KEY_PATTERN = /(api[_-]?key|token|authorization|secret|password|provider[_-]?config)/i;

export function redactSecret(value: string): string {
  if (value.length <= 8) return "****";
  return `${value.slice(0, 4)}${"*".repeat(value.length - 4)}`;
}

export function redactValue(key: string, value: unknown): unknown {
  if (typeof value === "string" && SECRET_KEY_PATTERN.test(key) && value.length > 0) {
    return redactSecret(value);
  }
  if (Array.isArray(value)) return value.map((item) => redactUnknown(item));
  if (value && typeof value === "object") return redactRecord(value as Record<string, unknown>);
  return value;
}

export function redactRecord(input: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    output[key] = redactValue(key, value);
  }
  return output;
}

export function redactUnknown(input: unknown): unknown {
  if (Array.isArray(input)) return input.map((item) => redactUnknown(item));
  if (input && typeof input === "object") return redactRecord(input as Record<string, unknown>);
  return input;
}
