export interface EpisodeExtraction {
  intent: string;
  action: string;
  outcome: string;
  lesson: string;
  importance: number;
  confidence: number;
}

export interface WorkingMemoryUpdateOutput {
  current_goal?: string | null;
  current_context?: string;
  active_hypotheses?: string[];
  open_questions?: string[];
  risk_flags?: string[];
}

export interface ReflectionOutput {
  whatWorked: string;
  whatFailed: string;
  lessons: string;
  updateCandidates: string;
  workingMemoryUpdate?: WorkingMemoryUpdateOutput;
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
