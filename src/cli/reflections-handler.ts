import { loadConfig } from "../config.js";
import { createRuntimeClient } from "../runtime-client/client.js";

export async function handleReflectionsList(options: {
  limit?: string;
  json?: boolean;
}, cliOverrides: Record<string, unknown> = {}): Promise<void> {
  const config = loadConfig(cliOverrides);
  const client = createRuntimeClient(config);
  const limit = parseInt(options.limit ?? "20", 10);
  const result = await client.listReflections(limit);
  const items = result.items as Array<{
    episodeId?: string;
    whatWorked?: string | null;
    whatFailed?: string | null;
    lessons?: string | null;
  }>;

  if (options.json) {
    console.log(JSON.stringify({ items, total: items.length }, null, 2));
  } else {
    console.log(`\nReflections (${items.length}):\n`);
    for (const r of items) {
      console.log(`  Episode: ${r.episodeId}`);
      console.log(`    Worked: ${r.whatWorked ?? "N/A"}`);
      console.log(`    Failed: ${r.whatFailed ?? "N/A"}`);
      console.log(`    Lessons: ${r.lessons ?? "N/A"}`);
      console.log("");
    }
  }
}
