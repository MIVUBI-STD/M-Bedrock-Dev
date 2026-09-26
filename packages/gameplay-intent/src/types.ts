export type GameplayIntentNodeKind =
  | "game"
  | "mechanic"
  | "actor"
  | "role"
  | "objective"
  | "phase"
  | "state"
  | "resource"
  | "lifecycle"
  | "spatial-region"
  | "policy"
  | "outcome";

export type GameplayIntentEdgeKind =
  | "owns"
  | "participates-in"
  | "produces"
  | "consumes"
  | "transitions-to"
  | "valid-during"
  | "scoped-to"
  | "located-in"
  | "resets"
  | "persists"
  | "requires"
  | "excludes"
  | "recovers-to"
  | "wins-by"
  | "loses-by";

export type GameplayIntentStatus =
  | "authored"
  | "inferred"
  | "hypothesis";

export type GameplayIntentEvidenceOrigin =
  | "source-code"
  | "manifest"
  | "command"
  | "scoreboard"
  | "tag"
  | "dialogue"
  | "translation"
  | "structure"
  | "world-db"
  | "runtime-observation"
  | "controlled-experiment"
  | "historical-diff"
  | "project-policy"
  | "official-documentation";

export interface GameplayIntentEvidence {
  id: string;
  origin: GameplayIntentEvidenceOrigin;
  locator: string;
  summary: string;
}

export interface GameplayIntentNode {
  id: string;
  kind: GameplayIntentNodeKind;
  label: string;
  status: GameplayIntentStatus;
  evidenceIds: readonly string[];
  description?: string;
}

export interface GameplayIntentEdge {
  id: string;
  from: string;
  to: string;
  kind: GameplayIntentEdgeKind;
  status: GameplayIntentStatus;
  evidenceIds: readonly string[];
  description?: string;
}

export type GameplayIntentInvariantStrength =
  | "must"
  | "must-not"
  | "should";

export interface GameplayIntentInvariant {
  id: string;
  statement: string;
  strength: GameplayIntentInvariantStrength;
  status: GameplayIntentStatus;
  subjectIds: readonly string[];
  evidenceIds: readonly string[];
}

export interface GameplayIntentUnknown {
  id: string;
  question: string;
  blockedSubjectIds: readonly string[];
  evidenceIds?: readonly string[];
}

export interface GameplayIntentModel {
  schemaVersion: 1;
  id: string;
  artifactId?: string;
  evidence: readonly GameplayIntentEvidence[];
  nodes: readonly GameplayIntentNode[];
  edges: readonly GameplayIntentEdge[];
  invariants: readonly GameplayIntentInvariant[];
  unknowns: readonly GameplayIntentUnknown[];
}

export type IntentGroundingDisposition =
  | "grounded"
  | "ambiguous"
  | "insufficient";

export interface IntentGroundingAssessment {
  disposition: IntentGroundingDisposition;
  subjectIds: readonly string[];
  unknownIds: readonly string[];
  unsupportedIds: readonly string[];
  reasons: readonly string[];
}
