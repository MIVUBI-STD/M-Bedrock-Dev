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
  | "combat"
  | "inventory"
  | "economy"
  | "ui"
  | "persistence"
  | "environment"
  | "gameplay"
  | "stability"
  | "world"
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

export interface FailurePattern {
  id: string;
  title: string;
  domain: ReliabilityDomain;
  summary: string;
  invariantIds: readonly string[];
  triggerTags: readonly string[];
  capabilityTags: readonly string[];
  supportingRegressionIds: readonly string[];
  detectionHints: readonly string[];
  retestFocus: readonly string[];
}

export interface RegressionProvenance {
  readonly source: string;
  readonly canonicalIssueId?: string;
  readonly issueType?: "BUG" | "DESIGN_MISMATCH";
  readonly reportPath?: string;
  readonly map?: string;
  readonly mapVersion?: string;
  readonly bugId?: string;
  readonly artifactFingerprint?: string;
  readonly [key: string]: unknown;
}

export interface RegressionCase {
  readonly id: string;
  readonly canonicalIssueId?: string;
  readonly title: string;
  readonly issueType?: "BUG" | "DESIGN_MISMATCH";
  readonly domain: ReliabilityDomain;
  readonly discoveredBy:
    | ReliabilityLane
    | "manual"
    | "approved-ai"
    | "approved-tester"
    | "static-audit"
    | "tester-runtime";
  readonly provenance?: RegressionProvenance;
  readonly invariantIds?: readonly string[];
  readonly triggerTags: readonly string[];
  readonly capabilityTags: readonly string[];
  readonly reproduction?: readonly string[];
  readonly expected: string;
  readonly observed: string;
  readonly fixturePath?: string;
  readonly firstObservedVersion?: string;
  readonly lastKnownGoodVersion?: string;
}

export interface HistoricalRegressionCatalogEntry {
  readonly id: string;
  readonly canonicalIssueId?: string;
  readonly title?: string;
  readonly [key: string]: unknown;
}

export interface HistoricalRegressionCatalog {
  readonly schemaVersion: 1;
  readonly regressions:
    readonly HistoricalRegressionCatalogEntry[];
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

export interface MapKnowledgeRecord {
  schemaVersion: 1;
  mapId: string;
  label: string;
  mapVersion?: string;
  editions: readonly string[];
  evidenceBasis: "artifact-inspection" | "historical-regression";
  evidenceRefs: readonly string[];
  architectureTags: readonly string[];
  gameplayPatternTags: readonly string[];
  capabilityTags: readonly string[];
  domains: readonly ReliabilityDomain[];
  riskSurfaces: readonly string[];
  invariantIds: readonly string[];
  regressionIds: readonly string[];
  failurePatternIds: readonly string[];
}

export type CoverageState = "covered" | "partial" | "unknown" | "not-applicable";

export interface BlindspotCoverage {
  domain: ReliabilityDomain;
  lane: ReliabilityLane;
  state: CoverageState;
  evidence?: string;
  proofPaths?: readonly string[];
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
