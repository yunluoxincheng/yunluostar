export interface Episode {
  id: string;
  sessionId: string;
  timestamp: Date;
  userInput: string;
  agentResponse: string;
  intent: string | null;
  action: string | null;
  outcome: string | null;
  lesson: string | null;
  importance: number;
  confidence: number;
  status: "active" | "deprecated" | "superseded";
  supersededBy: string | null;
  createdAt: Date;
}

export interface SemanticMemory {
  id: string;
  sourceEpisodeId: string | null;
  content: string;
  category: string | null;
  importance: number;
  confidence: number;
  status: "active" | "deprecated" | "superseded";
  supersededBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserModelEntry {
  id: string;
  key: string;
  value: string;
  evidence: string;
  confidence: number;
  status: "active" | "deprecated" | "superseded";
  supersededBy: string | null;
  sourceEpisodeId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SelfModelEntry {
  id: string;
  trait: string;
  value: string;
  evidence: string;
  confidence: number;
  mutable: boolean;
  status: "active" | "deprecated" | "superseded";
  supersededBy: string | null;
  sourceEpisodeId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Goal {
  id: string;
  description: string;
  priority: number;
  status: "active" | "completed" | "paused" | "deprecated";
  createdAt: Date;
  updatedAt: Date;
}

export interface Reflection {
  id: string;
  episodeId: string;
  whatWorked: string | null;
  whatFailed: string | null;
  lessons: string | null;
  updateCandidates: string | null;
  createdAt: Date;
}

export interface AuditLogEntry {
  id: string;
  targetTable: string;
  targetId: string;
  action: "create" | "update" | "deprecate" | "supersede" | "confidence_lower";
  beforeValue: string | null;
  afterValue: string | null;
  reason: string | null;
  timestamp: Date;
}
