import type {
  KnowledgeRuntimeConstraint,
} from "./applicability-v2.js";

export type KnowledgeSourceKind =
  | "official-contract"
  | "official-sample"
  | "official-changelog"
  | "runtime-observation"
  | "controlled-experiment"
  | "differential-experiment"
  | "community-research"
  | "project-policy";

export type KnowledgeSpecificity =
  | "generic"
  | "edition"
  | "version"
  | "exact-build";

export type KnowledgeReproducibility =
  | "not-tested"
  | "single-observation"
  | "repeatable"
  | "cross-run"
  | "cross-version";

export type KnowledgeTargetMatch =
  | "exact"
  | "compatible"
  | "adjacent"
  | "unknown";

export interface KnowledgeSourceRevision {
  id: string;
  sourceId: string;
  title: string;
  uri: string;
  sourceKind: KnowledgeSourceKind;
  retrievedAt: string;
  contentHash: string;
  sourceVersion?: string;
  claimLocator?: {
    heading?: string;
    anchor?: string;
    excerptHash?: string;
  };
}

export type KnowledgeEvidenceKind =
  | "source-revision"
  | "runtime-observation"
  | "controlled-experiment"
  | "differential-experiment"
  | "project-policy";

export interface KnowledgeEvidenceRef {
  id: string;
  kind: KnowledgeEvidenceKind;
  sourceRevisionId?: string;
  runtimeObservationId?: string;
  experimentId?: string;
  specificity: KnowledgeSpecificity;
  reproducibility: KnowledgeReproducibility;
  targetMatch: KnowledgeTargetMatch;
}

export type KnowledgeClaimClassification =
  | "documented-contract"
  | "observed-behavior"
  | "derived-rule"
  | "project-policy"
  | "hypothesis";

export type KnowledgeClaimCertainty =
  | "established"
  | "supported"
  | "conflicting"
  | "unknown";

export type KnowledgeClaimLifecycle =
  | "candidate"
  | "provisional"
  | "verified"
  | "contested"
  | "deprecated"
  | "superseded";

export interface KnowledgeEntityRef {
  kind:
    | "api"
    | "event"
    | "engine-phase"
    | "runtime-state"
    | "world-setting"
    | "entity-component"
    | "ai-goal"
    | "command"
    | "state-authority"
    | "gameplay-invariant"
    | "platform-capability";
  id: string;
}

export type KnowledgeClaimValue =
  | string
  | number
  | boolean
  | null
  | readonly string[];

export interface KnowledgeClaimV2 {
  schemaVersion: 2;
  id: string;
  subject: KnowledgeEntityRef;
  predicate: string;
  object: KnowledgeClaimValue;
  classification: KnowledgeClaimClassification;
  applicability: KnowledgeRuntimeConstraint;
  evidence: readonly KnowledgeEvidenceRef[];
  certainty: KnowledgeClaimCertainty;
  lifecycle: KnowledgeClaimLifecycle;
  falsifiers?: readonly string[];
  knownContradictions?: readonly string[];
  supersedes?: readonly string[];
  description?: string;
}

export function validateKnowledgeClaimV2(
  claim: KnowledgeClaimV2,
): string[] {
  const errors: string[] = [];

  if (claim.schemaVersion !== 2) {
    errors.push("Knowledge claim schemaVersion must be 2.");
  }
  if (!claim.id.trim()) {
    errors.push("Knowledge claim id must be non-empty.");
  }
  if (!claim.subject.id.trim()) {
    errors.push("Knowledge claim subject id must be non-empty.");
  }
  if (!claim.predicate.trim()) {
    errors.push("Knowledge claim predicate must be non-empty.");
  }

  if (
    claim.certainty === "established" &&
    claim.evidence.length === 0
  ) {
    errors.push(
      "Established knowledge claims require explicit evidence.",
    );
  }

  if (
    claim.classification === "documented-contract" &&
    !claim.evidence.some((evidence) => evidence.kind === "source-revision")
  ) {
    errors.push(
      "Documented-contract claims require source-revision evidence.",
    );
  }

  if (
    claim.classification === "observed-behavior" &&
    !claim.evidence.some((evidence) =>
      evidence.kind === "runtime-observation" ||
      evidence.kind === "controlled-experiment" ||
      evidence.kind === "differential-experiment"
    )
  ) {
    errors.push(
      "Observed-behavior claims require runtime or experiment evidence.",
    );
  }

  if (
    claim.classification === "project-policy" &&
    !claim.evidence.some((evidence) => evidence.kind === "project-policy")
  ) {
    errors.push(
      "Project-policy claims require project-policy evidence.",
    );
  }

  if (
    claim.lifecycle === "verified" &&
    claim.certainty === "unknown"
  ) {
    errors.push(
      "Verified knowledge claims cannot have unknown certainty.",
    );
  }

  return errors;
}
