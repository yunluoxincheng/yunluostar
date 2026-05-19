export interface ScoredItem {
  id: string;
  content: string;
  score: number;
}

export interface RelevanceScorer {
  score(input: string, candidates: Array<{ id: string; content: string }>): ScoredItem[];
}

export function createLexicalScorer(): RelevanceScorer {
  return {
    score(input, candidates) {
      const inputLower = input.toLowerCase();
      const inputTokens = new Set(tokenize(inputLower));

      return candidates
        .map((c) => {
          const contentLower = c.content.toLowerCase();
          const contentTokens = new Set(tokenize(contentLower));

          const intersection = [...inputTokens].filter((t) => {
            if (contentTokens.has(t)) return true;
            return [...contentTokens].some((ct) => ct.includes(t) || t.includes(ct));
          });

          const jaccard = inputTokens.size + contentTokens.size === 0
            ? 0
            : intersection.length / (inputTokens.size + contentTokens.size - intersection.length);

          const exactBoost = contentLower.includes(inputLower) ? 0.2 : 0;

          return { id: c.id, content: c.content, score: jaccard + exactBoost };
        })
        .sort((a, b) => b.score - a.score);
    },
  };
}

function tokenize(text: string): string[] {
  return text.split(/[\s\-]+/).filter((t) => t.length > 0);
}
