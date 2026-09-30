export type CandidateInvariantKind =
  | "player-phase-implies-connected"
  | "player-phase-implies-arena"
  | "arena-cutscene-implies-starting-player"
  | "disconnected-implies-zero-progress"
  | "player-tag-implies-score"
  | "playing-progress-nondecreasing"
  | "entity-arena-tag-consistency"
  | "entity-within-arena-region";

export type CandidateInvariantStatus =
  | "candidate"
  | "supported"
  | "challenged"
  | "stale"
  | "rejected";

export interface InvariantSupport {
  observations: number;
  distinctStates: number;
  distinctCoverageBuckets: number;
  distinctMaps: number;
  distinctVersions: number;
  antecedentMatches: number;
  satisfied: number;
  counterexamples: number;
  confidence: number;
}

export interface MinedInvariantCandidate {
  id: string;
  kind: CandidateInvariantKind;
  description: string;
  parameters?: Readonly<Record<string, string | number | boolean>>;
  minecraftVersions: string[];
  mapIds: string[];
  support: InvariantSupport;
  status: CandidateInvariantStatus;
  evidence: string[];
  counterexampleEvidence: string[];
  challengeEvidence: string[];
}

export interface TagScoreRelation {
  tag: string;
  objective: string;
  relation: "present" | "nonzero";
}

export interface ArenaRegion {
  arenaId: string;
  dimension?: string;
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

export interface InvariantMiningOptions {
  minAntecedentMatches: number;
  minConfidence: number;
  minDistinctStates?: number;
  minDistinctCoverageBuckets?: number;
  minDistinctMaps?: number;
  tagScoreRelations?: readonly TagScoreRelation[];
  arenaRegions?: readonly ArenaRegion[];
}

export interface InvariantMiningResult {
  observations: number;
  distinctStates: number;
  distinctCoverageBuckets: number;
  distinctMaps: number;
  minecraftVersions: string[];
  candidates: MinedInvariantCandidate[];
  rejected: MinedInvariantCandidate[];
}
