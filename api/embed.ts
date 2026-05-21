import type { VercelRequest, VercelResponse } from "@vercel/node";

const EMBEDDING_API_KEY = process.env.EMBEDDING_API_KEY ?? "";
const EMBEDDING_BASE_URL = process.env.EMBEDDING_BASE_URL ?? "https://open.bigmodel.cn/api/paas/v4";
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? "embedding-3";
const EMBEDDING_DIMENSIONS = Number(process.env.EMBEDDING_DIMENSIONS) || 2048;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN ?? "";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = req.headers["authorization"];
  if (ACCESS_TOKEN && auth !== `Bearer ${ACCESS_TOKEN}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { texts, model, dimensions } = req.body as {
    texts?: string[];
    model?: string;
    dimensions?: number;
  };

  if (!texts || !Array.isArray(texts) || texts.length === 0) {
    return res.status(400).json({ error: "texts must be a non-empty string array" });
  }

  if (texts.length > 64) {
    return res.status(400).json({ error: "Maximum 64 texts per request" });
  }

  if (!EMBEDDING_API_KEY) {
    return res.status(500).json({ error: "Embedding API key not configured" });
  }

  try {
    const response = await fetch(`${EMBEDDING_BASE_URL}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${EMBEDDING_API_KEY}`,
      },
      body: JSON.stringify({
        model: model ?? EMBEDDING_MODEL,
        input: texts,
        dimensions: dimensions ?? EMBEDDING_DIMENSIONS,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return res.status(response.status).json({ error: `Upstream error: ${response.status}`, detail: body.slice(0, 200) });
    }

    const data = (await response.json()) as {
      data: Array<{ embedding: number[] }>;
    };

    const embeddings = data.data.map((item) => item.embedding);
    return res.status(200).json({ data: embeddings });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
}
