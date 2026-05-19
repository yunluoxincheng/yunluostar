import {
  loadConfig,
  redactConfig,
  validateConfigKey,
  writeConfig,
  getProjectConfigPath,
  getUserConfigPath,
  configSchema,
} from "../config.js";

export async function handleConfigShow(): Promise<void> {
  const config = loadConfig();
  const redacted = redactConfig(config);
  console.log(JSON.stringify(redacted, null, 2));
}

export async function handleConfigSet(key: string, value: string, options: { user?: boolean }): Promise<void> {
  if (!validateConfigKey(key)) {
    const validKeys = Object.keys(configSchema.shape).join(", ");
    console.error(`Unknown config key: "${key}". Supported keys: ${validKeys}`);
    process.exit(1);
  }

  const parsedValue = parseConfigValue(key, value);
  const filePath = options.user ? getUserConfigPath() : getProjectConfigPath();

  writeConfig(filePath, { [key]: parsedValue });
  console.log(`Set ${key} in ${options.user ? "user" : "project"} config.`);
}

function parseConfigValue(key: string, value: string): string | number {
  if (key === "temperature") {
    const num = Number(value);
    if (isNaN(num) || num < 0 || num > 2) {
      console.error("temperature must be a number between 0 and 2");
      process.exit(1);
    }
    return num;
  }
  if (key === "timeout") {
    const num = Number(value);
    if (isNaN(num) || !Number.isInteger(num) || num <= 0) {
      console.error("timeout must be a positive integer");
      process.exit(1);
    }
    return num;
  }
  return value;
}
