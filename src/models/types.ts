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
  type: "core" | "long_term" | "medium_term" | "short_term" | "operational";
  priority: number;
  status: "suggested" | "active" | "paused" | "completed" | "rejected" | "deprecated";
  mutable: boolean;
  requiresApproval: boolean;
  approvedAt: Date | null;
  sourceEpisodeId: string | null;
  evidence: string | null;
  rationale: string | null;
  conflictOf: string | null;
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
  action: "create" | "update" | "deprecate" | "supersede" | "confidence_lower" | "approve" | "reject" | "pause" | "complete" | "conflict";
  beforeValue: string | null;
  afterValue: string | null;
  reason: string | null;
  timestamp: Date;
}
