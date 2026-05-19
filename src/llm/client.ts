export interface EpisodeExtraction {
  intent: string;
  action: string;
  outcome: string;
  lesson: string;
  importance: number;
  confidence: number;
}

export interface ReflectionOutput {
  whatWorked: string;
  whatFailed: string;
  lessons: string;
  updateCandidates: string;
}

export interface ConsolidationOutput {
  semanticMemories: Array<{
    content: string;
    category: string;
    importance: number;
    confidence: number;
  }>;
  userModelUpdates: Array<{
    key: string;
    value: string;
    evidence: string;
    confidence: number;
  }>;
  selfModelUpdates: Array<{
    trait: string;
    value: string;
    evidence: string;
    confidence: number;
    mutable: boolean;
  }>;
}

export interface LLMClient {
  generateResponse(context: string, userInput: string, onToken?: (token: string) => void): Promise<string>;
  extractEpisode(userInput: string, agentResponse: string): Promise<EpisodeExtraction>;
  reflect(userInput: string, agentResponse: string, context: string): Promise<ReflectionOutput>;
  consolidate(episode: EpisodeExtraction, reflection: ReflectionOutput): Promise<ConsolidationOutput>;
}
