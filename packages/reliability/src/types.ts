export type ReliabilityLane =
  | "static"
  | "package"
  | "generative"
  | "runtime"
  | "differential";

export type ReliabilityDomain =
  | "artifact"
  | "commands"
  | "entities"
  | "structures"
  | "scripts"
  | "world-db"
  | "multiplayer"
  | "state"
  | "chunks"
  | "compatibility"
  | "education"
  | "unknown";

export type InvariantSeverity = "minor" | "medium" | "critical";

export interface ReliabilityInvariant {
  id: string;
  title: string;
  description: string;
  domain: ReliabilityDomain;
  severity: InvariantSeverity;
  lanes: readonly ReliabilityLane[];
  tags: readonly string[];
  source: "built-in" | "project" | "regression";
}

export interface RegressionCase {
  id: string;
  title: string;
  domain: ReliabilityDomain;
  discoveredBy: ReliabilityLane | "manual";
  invariantIds: readonly string[];
  triggerTags: readonly string[];
  capabilityTags: readonly string[];
  reproduction: readonly string[];
  expected: string;
  observed: string;
  fixturePath?: string;
  firstObservedVersion?: string;
  lastKnownGoodVersion?: string;
}

export type UpdateChangeKind =
  | "added"
  | "removed"
  | "changed"
  | "validation-tightened"
  | "behavior-changed"
  | "deprecated"
  | "unknown";

export interface UpdateDeltaEntry {
  id: string;
  kind: UpdateChangeKind;
  domain: ReliabilityDomain;
  capabilityTags: readonly string[];
  affectedIdentifiers: readonly string[];
  summary: string;
  source: string;
  confidence: "documented" | "observed" | "inferred";
}

export interface MinecraftUpdateDelta {
  fromVersion?: string;
  toVersion: string;
  entries: readonly UpdateDeltaEntry[];
}

export interface MapCompatibilityFingerprint {
  schemaVersion: 1;
  mapId: string;
  artifactFingerprint?: string;
  minEngineVersions: readonly string[];
  editions: readonly string[];
  experiments: readonly string[];
  commandVerbs: readonly string[];
  scriptModules: readonly string[];
  capabilityTags: readonly string[];
  domains: readonly ReliabilityDomain[];
  structures: {
    count: number;
    parsed: number;
  };
  worldDatabasePresent: boolean;
  riskSurfaces: readonly string[];
}

export type CoverageState = "covered" | "partial" | "unknown" | "not-applicable";

export interface BlindspotCoverage {
  domain: ReliabilityDomain;
  lane: ReliabilityLane;
  state: CoverageState;
  evidence?: string;
}

export type RetestPriority = "P0" | "P1" | "P2" | "P3";

export interface RetestReason {
  kind:
    | "update-overlap"
    | "historical-regression"
    | "coverage-gap"
    | "runtime-sensitive"
    | "causal-regression";
  detail: string;
  weight: number;
}

export interface RetestPlan {
  mapId: string;
  updateVersion: string;
  priority: RetestPriority;
  reasons: RetestReason[];
  suggestedLanes: ReliabilityLane[];
  affectedDomains: ReliabilityDomain[];
}
