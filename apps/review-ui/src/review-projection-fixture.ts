import type {
  EngineeringReviewProjection,
} from "../../../packages/orchestrator/src/index.js";

export const reviewProjectionFixture: EngineeringReviewProjection = {
  schemaVersion: 1,
  artifact: {
    id: "blitz-build-v1.0.2",
    fingerprint: "f".repeat(64),
    archiveEntries: 128,
    target: {
      edition: "bedrock",
      version: "1.26.32",
    },
  },
  understanding: {
    nodes: 42,
    authoredNodes: 24,
    inferredNodes: 15,
    hypothesisNodes: 3,
    invariants: 8,
    unknowns: [],
  },
  runtimeClassifications: {
    "confirmed-defect": 1,
    "probable-defect": 1,
    "designed-behavior": 1,
    "engine-constraint": 0,
    "compatibility-difference": 0,
    "insufficient-evidence": 0,
    "ambiguous-intent": 0,
    "runtime-proof-required": 1,
  },
  runtimeAssessments: [
    {
      id: "runtime:outside-plot:obs:1",
      outcomeId: "player affects blocks outside build plot",
      disposition: "confirmed-defect",
      subjectIds: ["build-plot"],
      basisInvariantIds: ["inv:build-plot-interaction"],
      evidenceIds: ["ev:outside-plot-runtime"],
      nextEvidenceNeed: "none",
      reasons: [
        "Runtime evidence contradicts the authored rule that build interactions are limited to the active plot.",
      ],
    },
    {
      id: "runtime:reconnect:obs:2",
      outcomeId: "reconnect may keep stale session state",
      disposition: "runtime-proof-required",
      subjectIds: ["session"],
      basisInvariantIds: [],
      evidenceIds: ["ev:reconnect-static"],
      nextEvidenceNeed: "runtime-proof",
      reasons: [
        "The behavior depends on multiplayer runtime ordering, so static evidence cannot confirm a defect.",
      ],
    },
    {
      id: "runtime:cleanup:obs:3",
      outcomeId: "cleanup may leave stale arena generation",
      disposition: "probable-defect",
      subjectIds: ["arena-cleanup"],
      basisInvariantIds: ["inv:arena-cleanup"],
      evidenceIds: ["ev:cleanup-inferred"],
      nextEvidenceNeed: "authored-intent",
      reasons: [
        "Observed evidence contradicts inferred cleanup intent, but authored intent is not yet strong enough for confirmation.",
      ],
    },
    {
      id: "runtime:score-return:obs:4",
      outcomeId: "round end scoring matches authored behavior",
      disposition: "designed-behavior",
      subjectIds: ["round-score"],
      basisInvariantIds: ["inv:round-score"],
      evidenceIds: ["ev:score-design"],
      nextEvidenceNeed: "none",
      reasons: [
        "The observed scoring path matches the authored scoring behavior recovered from the map.",
      ],
    },
  ],
  attention: [],
  diagnosticDefinitions: [
    {
      code: "CROSS_SCOPE_STATE_RISK",
      title: "Cross Scope State Risk",
      category: "state",
      evidenceBoundary: "static",
      severityAuthority: "finding",
    },
  ],
  diagnostics: [
    {
      id: "diag:cross-scope",
      code: "CROSS_SCOPE_STATE_RISK",
      severity: "critical",
      message: "Arena-scoped state can be mutated outside the active scope.",
      relatedNodeIds: ["session"],
    },
  ],
  incidents: [],
  repairCandidates: [
    {
      kind: "linear-topology-outlier",
      diagnosticCode: "TOPOLOGY_TRANSLATION_OUTLIER",
      sourcePath: "scripts/arena/session.ts",
      status: "planned",
    },
  ],
  evidenceRecovery: {
    required: false,
    actions: [],
    blocksCurrentStateClaims: false,
    blocksTemporalClaims: false,
    blocksFullRepairAuthorization: false,
  },
  decisionBasis: {
    sourceFingerprint: "f".repeat(64),
  },
  invalidation: {
    items: [
      {
        id: "validation:cleanup:stale",
        source: "validation",
        category: "validation-artifact-changed",
        summary: "Arena cleanup test result is outdated.",
        reason: "artifact fingerprint changed since this validation run",
        nextAction: "rerun-validation",
        blocking: true,
        validationRunId: "run:cleanup-1",
      },
    ],
    invalidatedDecisionCount: 0,
    supersededDecisionCount: 0,
    staleValidationRunCount: 1,
    blockingCount: 1,
  },
  priority: {
    order: [
      "blocking-proof",
      "confirmed-defect",
      "critical-diagnostic",
      "evidence-required",
      "probable-defect",
      "repair-follow-up",
    ],
    items: [],
    hasBlockingProofGap: true,
    hasConfirmedDefect: true,
    hasCriticalDiagnostic: true,
  },
};
