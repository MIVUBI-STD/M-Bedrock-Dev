export type CandidateInvariantKind =
  | "player-phase-implies-connected"
  | "player-phase-implies-arena"
  | "arena-cutscene-implies-starting-player"
  | "disconnected-implies-zero-progress";

export type CandidateInvariantStatus =
  | "candidate"
  | "supported"
  | "challenged"
  | "rejected";

export interface InvariantSupport {
  observations: number;
  antecedentMatches: number;
  satisfied: number;
  counterexamples: number;
  confidence: number;
}

export interface MinedInvariantCandidate {
  id: string;
  kind: CandidateInvariantKind;
  description: string;
  support: InvariantSupport;
  status: CandidateInvariantStatus;
  evidence: string[];
  counterexampleEvidence: string[];
  challengeEvidence: string[];
}

export interface InvariantMiningOptions {
  minAntecedentMatches: number;
  minConfidence: number;
}

export interface InvariantMiningResult {
  observations: number;
  candidates: MinedInvariantCandidate[];
  rejected: MinedInvariantCandidate[];
}
