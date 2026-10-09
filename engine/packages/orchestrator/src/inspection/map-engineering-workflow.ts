import type {
  InspectArtifactResult,
} from "./inspect-artifact.js";

export type MapWorkflowStageStatus =
  | "ready"
  | "partial"
  | "blocked";

export interface MapWorkflowStage {
  id:
    | "understand"
    | "diagnose"
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
  attention: {
    criticalDiagnostics: number;
    unresolvedReferences: number;
    contractUnknowns: number;
    gameplayDiscoveryClosure:
      InspectArtifactResult["gameplayDiscoveryClosure"]["status"];
    gameplayClosure:
      InspectArtifactResult["gameplaySemantic"]["gameplayClosure"]["status"];
    evidenceRecoveryActions: number;
    repairProposals: number;
    hiddenDefectRisks: number;
    engineeringAnalyses: number;
    capabilityExposureRisks: number;
    highRiskSurfaces: number;
  };
  nextActions: readonly string[];
}

function understandingStage(
  source: InspectArtifactResult,
): MapWorkflowStage {
  const unresolved =
    source.unresolvedReferences;
  const contractUnknowns =
    source.gameplaySemantic.intent.unknowns.length;
  const discovery =
    source.gameplayDiscoveryClosure;
  const closure =
    source.gameplaySemantic.gameplayClosure;

  return {
    id: "understand",
    status:
      discovery.status === "OPEN" ||
      closure.status === "OPEN"
        ? "blocked"
        : discovery.status === "PARTIAL" ||
          closure.status === "PARTIAL" ||
          unresolved > 0 ||
          contractUnknowns > 0
          ? "partial"
          : "ready",
    reasons: [
      "Gameplay Discovery Closure: " +
        discovery.status +
        ".",
      "Gameplay Model Closure: " +
        closure.status +
        ".",
      unresolved === 0
        ? "Selected-artifact semantic references are resolved."
        : String(unresolved) +
          " selected-artifact semantic reference(s) remain unresolved.",
      contractUnknowns === 0
        ? "No explicit Gameplay Contract unknown is recorded."
        : String(contractUnknowns) +
          " Gameplay Contract unknown(s) remain.",
    ],
  };
}

function diagnosisStage(
  source: InspectArtifactResult,
): MapWorkflowStage {
  const recovery =
    source.evidenceRecovery.actions.length;
  const runtimeNeeds =
    source.gameplayIntentRuntime
      .routeInstrumentationRequired +
    source.gameplayIntentRuntime
      .routeEvidenceBlocked;
  const hidden =
    source.hiddenGameplayDefects.attention;
  const hiddenHighRisk =
    hidden.implementationOnlyIntent +
    hidden.highTemporalRisks +
    hidden.designAnomalies +
    hidden.silentDegradations;

  return {
    id: "diagnose",
    status:
      recovery > 0 ||
      runtimeNeeds > 0 ||
      hiddenHighRisk > 0
        ? "partial"
        : "ready",
    reasons: [
      String(source.diagnostics.length) +
        " diagnostic finding(s) are available.",
      recovery > 0
        ? String(recovery) +
          " evidence recovery action(s) remain."
        : "No evidence recovery action is pending.",
      runtimeNeeds > 0
        ? String(runtimeNeeds) +
          " runtime evidence need(s) remain."
        : "No runtime evidence need is currently recorded.",
      hidden.implementationOnlyIntent > 0
        ? String(hidden.implementationOnlyIntent) +
          " gameplay intent surface(s) are enforced by implementation without independent design proof."
        : "No implementation-only intent surface requires challenge.",
      hidden.highTemporalRisks > 0
        ? String(hidden.highTemporalRisks) +
          " high-risk temporal interaction(s) require review."
        : "No high-risk temporal interaction is pending.",
      hidden.designAnomalies > 0
        ? String(hidden.designAnomalies) +
          " design-consistency anomaly/anomalies require intent review."
        : "No design-consistency anomaly is pending.",
      hidden.silentDegradations > 0
        ? String(hidden.silentDegradations) +
          " silent gameplay degradation signal(s) require review."
        : "No silent gameplay degradation is pending.",
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
  const exposedSensitiveCapability =
    source.capabilityExposure
      .releaseBlocking > 0;
  const discoveryOpen =
    source.gameplayDiscoveryClosure.status === "OPEN";
  const closureOpen =
    source.gameplaySemantic.gameplayClosure.status === "OPEN";

  return {
    id: "release",
    status:
      discoveryOpen ||
      closureOpen ||
      releaseConflict ||
      packDrift ||
      critical ||
      exposedSensitiveCapability
        ? "blocked"
        : source.releaseIdentity.status ===
            "consistent"
          ? "ready"
          : "partial",
    reasons: [
      discoveryOpen
        ? "Gameplay Discovery Closure is OPEN and blocks release readiness."
        : "Gameplay Discovery Closure does not block release readiness.",
      closureOpen
        ? "Gameplay Model Closure is OPEN and blocks release readiness."
        : "Gameplay Model Closure does not block release readiness.",
      "Release identity: " +
        source.releaseIdentity.status +
        ".",
      packDrift
        ? "Pack identity drift is present."
        : "No pack identity drift is present.",
      critical
        ? "Critical diagnostics remain open."
        : "No critical diagnostic currently blocks release.",
      exposedSensitiveCapability
        ? String(
            source.capabilityExposure
              .releaseBlocking,
          ) +
          " sensitive capability exposure(s) block release."
        : "No sensitive capability exposure blocks release.",
    ],
  };
}

export function buildMapEngineeringWorkflow(
  source: InspectArtifactResult,
): MapEngineeringWorkflowProjection {
  const stages = [
    understandingStage(source),
    diagnosisStage(source),
    releaseStage(source),
  ];

  const attention = {
    criticalDiagnostics:
      source.diagnostics.filter(
        (item) => item.severity === "critical",
      ).length,
    unresolvedReferences:
      source.unresolvedReferences,
    contractUnknowns:
      source.gameplaySemantic.intent.unknowns.length,
    gameplayDiscoveryClosure:
      source.gameplayDiscoveryClosure.status,
    gameplayClosure:
      source.gameplaySemantic.gameplayClosure.status,
    evidenceRecoveryActions:
      source.evidenceRecovery.actions.length,
    repairProposals:
      source.repairCandidates.filter(
        (item) => item.status === "proposal",
      ).length,
    hiddenDefectRisks:
      source.hiddenGameplayDefects.attention
        .implementationOnlyIntent +
      source.hiddenGameplayDefects.attention
        .highTemporalRisks +
      source.hiddenGameplayDefects.attention
        .designAnomalies +
      source.hiddenGameplayDefects.attention
        .silentDegradations,
    engineeringAnalyses:
      source.engineeringAnalyses.length,
    capabilityExposureRisks:
      source.capabilityExposure
        .releaseBlocking,
    highRiskSurfaces:
      source.analysisPriorities.filter(
        (item) =>
          item.priority === "high",
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
    attention,
    nextActions,
  };
}
