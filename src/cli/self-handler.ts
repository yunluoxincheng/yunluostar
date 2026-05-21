import { loadConfig } from "../config.js";
import { createRuntimeClient } from "../runtime-client/client.js";

export async function handleSelfShow(options: {
  json?: boolean;
}, cliOverrides: Record<string, unknown> = {}): Promise<void> {
  const config = loadConfig(cliOverrides);
  const client = createRuntimeClient(config);
  const result = await client.listSelfModel();
  const items = result.items as Array<{
    trait?: string;
    value?: string;
    evidence?: string;
    confidence?: number;
  }>;

  if (options.json) {
    console.log(JSON.stringify({ items, total: items.length }, null, 2));
  } else {
    console.log(`\nSelf Model (${items.length} active traits):\n`);
    for (const item of items) {
      console.log(`  ${item.trait}: ${item.value}`);
      console.log(`    evidence: ${(item.evidence ?? "").slice(0, 60)} (confidence: ${item.confidence})`);
    }
  }
}
