import type {
  InspectArtifactResult,
} from "../inspect-artifact.js";
import {
  buildArenaEngineeringProjection,
} from "../arena-engineering-projection.js";

export type MapWorkflowStageStatus =
  | "ready"
  | "partial"
  | "blocked"
  | "not-applicable";

export interface MapWorkflowStage {
  id:
    | "understand"
    | "diagnose"
    | "repair"
    | "validate"
    | "release";
  status: MapWorkflowStageStatus;
  reasons: readonly string[];
}

export interface MapEngineeringWorkflowProjection {
  schemaVersion: 1;
  artifact: {
    id: string;
    fingerprint: string;
    target: InspectArtifactResult["targetCompatibility"];
  };
  stages: readonly MapWorkflowStage[];
  /** @deprecated Compatibility composite. */
  world: InspectArtifactResult["gameplayWorld"];
  semantic: InspectArtifactResult["gameplaySemantic"];
  engineering: InspectArtifactResult["engineeringAssessment"];
  arena: ReturnType<
    typeof buildArenaEngineeringProjection
  >;
  attention: {
    criticalDiagnostics: number;
    unresolvedReferences: number;
    intentUnknowns: number;
    evidenceRecoveryActions: number;
    repairProposals: number;
    repairUnsupported: number;
  };
  nextActions: readonly string[];
}

function understandingStage(
  source: InspectArtifactResult,
): MapWorkflowStage {
  const unknowns =
    source.gameplaySemantic.intent.unknowns.length;
  const unresolved =
    source.unresolvedReferences;
  const lifecycleUnresolved =
    source.engineeringAssessment.arena.lifecycle.unresolved;
  const cleanupMissing =
    source.engineeringAssessment.arena.cleanup
      .resourceLedger?.missing ?? 0;
  const spatialAuthorityUncovered =
    source.engineeringAssessment.spatial.authority
      ?.uncovered ?? 0;
  const spatialAuthorityConflicts =
    source.engineeringAssessment.spatial.authority
      ?.conflicts ?? 0;
  const spatialAuthorityUnknownRegions =
    source.engineeringAssessment.spatial.authority
      ?.unknownRegions ?? 0;
  const spatialAuthorityPolicyInvalid =
    source.engineeringAssessment.spatial.authority
      ?.configured === true &&
    source.engineeringAssessment.spatial.authority
      ?.policyValid === false
      ? 1
      : 0;

  return {
    id: "understand",
    status:
      unresolved === 0 &&
      unknowns === 0 &&
      lifecycleUnresolved === 0 &&
      cleanupMissing === 0 &&
      spatialAuthorityUncovered === 0 &&
      spatialAuthorityConflicts === 0 &&
      spatialAuthorityUnknownRegions === 0 &&
      spatialAuthorityPolicyInvalid === 0
        ? "ready"
        : "partial",
    reasons: [
      unresolved === 0
        ? "All semantic references used by the current inspection are resolved."
        : String(unresolved) +
          " semantic reference(s) remain unresolved.",
      unknowns === 0
        ? "Gameplay world model has no explicit blocked intent unknowns."
        : String(unknowns) +
          " gameplay intent unknown(s) remain.",
      lifecycleUnresolved === 0
        ? "Arena lifecycle terminal convergence has no unresolved path."
        : String(lifecycleUnresolved) +
          " arena lifecycle terminal path(s) remain unresolved.",
      cleanupMissing === 0
        ? "No acquired arena resource is currently missing terminal cleanup coverage."
        : String(cleanupMissing) +
          " acquired arena resource(s) have no complete terminal cleanup coverage.",
      spatialAuthorityUncovered === 0
        ? "No configured spatial authority requirement is uncovered."
        : String(spatialAuthorityUncovered) +
          " spatial authority requirement(s) are uncovered.",
      spatialAuthorityConflicts === 0
        ? "No equally-specific spatial authority rules conflict."
        : String(spatialAuthorityConflicts) +
          " spatial authority requirement(s) resolve to conflicting rules.",
      spatialAuthorityUnknownRegions === 0
        ? "No spatial authority requirement references an unknown region."
        : String(spatialAuthorityUnknownRegions) +
          " spatial authority requirement(s) reference unknown regions.",
      spatialAuthorityPolicyInvalid === 0
        ? "Configured spatial authority policy is structurally valid."
        : "Configured spatial authority policy is invalid or references unknown region contracts.",
    ],
  };
}

function diagnosisStage(
  source: InspectArtifactResult,
): MapWorkflowStage {
  const incidents =
    source.causalAnalysis.incidents.length;
  const recovery =
    source.evidenceRecovery.actions.length;
  const runtimeNeeds =
    source.gameplayIntentRuntime
      .routeInstrumentationRequired +
    source.gameplayIntentRuntime
      .routeEvidenceBlocked;

  return {
    id: "diagnose",
    status:
      recovery > 0
        ? "partial"
        : incidents > 0 || source.diagnostics.length > 0
          ? "ready"
          : runtimeNeeds > 0
            ? "partial"
            : "ready",
    reasons: [
      String(source.diagnostics.length) +
        " diagnostic finding(s) are available.",
      String(incidents) +
        " causal incident(s) are modeled.",
      recovery > 0
        ? String(recovery) +
          " evidence recovery action(s) remain before stronger runtime claims."
        : "No evidence recovery action currently blocks diagnosis.",
    ],
  };
}

function repairStage(
  source: InspectArtifactResult,
): MapWorkflowStage {
  const planned =
    source.repairCandidates.filter(
      (item) => item.status === "proposal",
    ).length;
  const unsupported =
    source.repairCandidates.filter(
      (item) => item.status === "unsupported",
    ).length;
  const localized =
    source.arenaAnalysis
      .repairLocalization?.localized ?? 0;
  const localizationUnresolved =
    source.arenaAnalysis
      .repairLocalization?.unresolved ?? 0;

  if (
    planned === 0 &&
    localized === 0 &&
    source.diagnostics.length === 0
  ) {
    return {
      id: "repair",
      status: "not-applicable",
      reasons: [
        "No current diagnostic requires a repair path.",
      ],
    };
  }

  return {
    id: "repair",
    status:
      planned > 0
        ? "partial"
        : localized > 0 &&
            localizationUnresolved === 0
          ? "partial"
          : "blocked",
    reasons: [
      String(planned) +
        " deterministic repair proposal(s) are available; approval is still required.",
      String(localized) +
        " arena divergence source localization(s) are available.",
      String(localizationUnresolved) +
        " arena divergence source localization(s) remain unresolved.",
      unsupported > 0
        ? String(unsupported) +
          " repair proposal(s) are unsupported for deterministic transformation."
        : "No current repair proposal is marked unsupported.",
    ],
  };
}

function validationStage(
  source: InspectArtifactResult,
): MapWorkflowStage {
  const stress =
    source.arenaAnalysis.stressPlan;
  const repeated =
    source.arenaAnalysis.repeatedRunPlan;
  const recovery =
    source.evidenceRecovery.actions.length;

  return {
    id: "validate",
    status:
      stress?.status === "planned" &&
      repeated !== undefined &&
      recovery === 0
        ? "ready"
        : stress?.status === "planned" ||
            repeated !== undefined
          ? "partial"
          : "blocked",
    reasons: [
      stress?.status === "planned"
        ? String(stress.matrix?.scenarios.length ?? 0) +
          " arena stress scenario(s) are planned."
        : "Arena stress scenario planning is unavailable.",
      repeated === undefined
        ? "Repeated-run cleanup validation is unavailable."
        : "Repeated-run validation is planned for " +
          repeated.runCounts.join("/") +
          " cycle(s).",
      recovery > 0
        ? "Validation evidence integrity still requires recovery actions."
        : "No evidence recovery action currently blocks validation planning.",
    ],
  };
}

function releaseStage(
  source: InspectArtifactResult,
): MapWorkflowStage {
  const releaseConflict =
    source.releaseIdentity.status === "conflict";
  const packDrift =
    source.diagnostics.some(
      (item) =>
        item.code === "PACK_IDENTITY_DRIFT",
    );
  const critical =
    source.diagnostics.some(
      (item) => item.severity === "critical",
    );

  return {
    id: "release",
    status:
      releaseConflict ||
      packDrift ||
      critical
        ? "blocked"
        : source.releaseIdentity.status ===
            "consistent"
          ? "ready"
          : "partial",
    reasons: [
      "Release identity status: " +
        source.releaseIdentity.status +
        ".",
      packDrift
        ? "Persisted/current pack identity drift is present."
        : "No pack identity drift diagnostic is present.",
      critical
        ? "Critical diagnostics remain open."
        : "No critical diagnostic currently blocks release.",
    ],
  };
}

export function buildMapEngineeringWorkflow(
  source: InspectArtifactResult,
): MapEngineeringWorkflowProjection {
  const stages = [
    understandingStage(source),
    diagnosisStage(source),
    repairStage(source),
    validationStage(source),
    releaseStage(source),
  ];

  const attention = {
    criticalDiagnostics:
      source.diagnostics.filter(
        (item) => item.severity === "critical",
      ).length,
    unresolvedReferences:
      source.unresolvedReferences,
    intentUnknowns:
      source.gameplaySemantic.intent.unknowns.length,
    evidenceRecoveryActions:
      source.evidenceRecovery.actions.length,
    repairProposals:
      source.repairCandidates.filter(
        (item) => item.status === "proposal",
      ).length,
    repairUnsupported:
      source.repairCandidates.filter(
        (item) => item.status === "unsupported",
      ).length,
  };

  const nextActions = stages
    .filter(
      (stage) =>
        stage.status === "partial" ||
        stage.status === "blocked",
    )
    .map(
      (stage) =>
        stage.id +
        ": " +
        stage.reasons.join(" "),
    );

  return {
    schemaVersion: 1,
    artifact: {
      id: source.artifactId,
      fingerprint: source.fingerprint,
      target: source.targetCompatibility,
    },
    stages,
    world: source.gameplayWorld,
    semantic: source.gameplaySemantic,
    engineering: source.engineeringAssessment,
    arena:
      buildArenaEngineeringProjection(source),
    attention,
    nextActions,
  };
}
