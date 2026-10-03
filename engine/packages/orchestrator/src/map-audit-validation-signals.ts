import type {
  GameplayModelClosureResult,
} from "../../gameplay-intent/src/index.js";
import type {
  GameplayIssueFailureDomain,
  GameplayIssueFlowStage,
  NegativeSpaceSignal,
  TemporalInteractionRisk,
} from "../../diagnostic-reasoning/src/index.js";
import {
  sortIssues,
  type NeedValidationAuditIssueProjection,
} from "./map-audit-issue-projection.js";

export function projectSignalNeedValidationAuditIssues(
  negativeSpace: readonly NegativeSpaceSignal[],
  temporalRisks: readonly TemporalInteractionRisk[],
): readonly NeedValidationAuditIssueProjection[] {
  const negative = negativeSpace.map((signal) => {
    const flow: GameplayIssueFlowStage =
      signal.kind === "reset-without-baseline"
        ? "CLEANUP_REPLAY"
        : signal.kind === "entry-without-exit"
          ? "PROGRESSION"
          : "ACTIVE_GAMEPLAY";
    const failureDomain: GameplayIssueFailureDomain =
      signal.kind === "reset-without-baseline"
        ? "persistence-recovery"
        : "state-ownership";

    return {
      status: "NEED_VALIDATION" as const,
      issueType: "BUG" as const,
      failureDomain,
      contributingDomains: [failureDomain],
      gameplayFlow: flow,
      informationMismatch: false,
      playerFacingEvidenceIds: [],
      causalLinkId: signal.id,
      scenarioId: "signal:" + signal.subjectId,
      gameplayStage: flow,
      scenarioLabel: signal.kind,
      gameplayTrigger:
        "Exercise gameplay that reads, writes, enters, exits, or resets " +
        signal.subjectId +
        ".",
      gameplayConsequence:
        "A missing lifecycle counterpart can leave gameplay state incomplete, stale, or permanently blocked.",
      expectedOutcome:
        "Every material lifecycle/state operation has the required consuming, exit, reset, or effect path.",
      actualOutcome: signal.reason,
      affectedScope: signal.subjectId,
      subjectIds: [signal.subjectId],
      componentIds: [],
      evidenceIds: [...signal.evidenceIds],
      validationReason:
        "Negative-space analysis found a materially asymmetric gameplay lifecycle, but the player-visible consequence still needs direct causal confirmation.",
      missingProof:
        "A scenario-scoped proof that the missing counterpart is truly required and reachable for player-visible gameplay.",
      validationTest:
        "Trigger the gameplay path for " +
        signal.subjectId +
        " and verify the missing counterpart implied by " +
        signal.kind +
        ". Fail if state cannot progress, reset, or return to baseline as required.",
      validationGroupKey:
        "negative-space:" +
        signal.subjectId,
    } satisfies NeedValidationAuditIssueProjection;
  });

  const temporal = temporalRisks
    .filter((risk) => risk.priority === "high")
    .map((risk) => ({
      status: "NEED_VALIDATION" as const,
      issueType: "BUG" as const,
      failureDomain: "temporal-async" as const,
      contributingDomains: [
        "temporal-async" as const,
      ],
      gameplayFlow: "RECOVERY" as const,
      informationMismatch: false,
      playerFacingEvidenceIds: [],
      causalLinkId:
        "temporal-risk:" +
        risk.leftSystem +
        ":" +
        risk.rightSystem,
      scenarioId:
        "temporal:" +
        risk.leftSystem +
        ":" +
        risk.rightSystem,
      gameplayStage: "RECOVERY",
      scenarioLabel: "temporal-interaction",
      gameplayTrigger:
        "Exercise " +
        risk.leftSystem +
        " and " +
        risk.rightSystem +
        " across before/overlap/after timing windows.",
      gameplayConsequence:
        "A delayed or shared mutation may commit after ownership, phase, player, or arena state has changed.",
      expectedOutcome:
        "Temporal work is cancelled or revalidated before it can mutate stale gameplay state.",
      actualOutcome:
        "High-risk timing factors are present: " +
        risk.factors.join(", ") +
        ".",
      affectedScope:
        risk.leftSystem +
        " ↔ " +
        risk.rightSystem,
      subjectIds: [
        risk.leftSystem,
        risk.rightSystem,
      ].sort(),
      componentIds: [],
      evidenceIds: [],
      validationReason:
        "Temporal analysis found a high-risk interaction whose exact commit ordering is not yet causally proven.",
      missingProof:
        "Whether stale or overlapping work can actually commit after the relevant ownership/state transition.",
      validationTest:
        "Run " +
        risk.leftSystem +
        " and " +
        risk.rightSystem +
        " in before, overlap, and after timing windows; fail if old work mutates the new/terminal state.",
      validationGroupKey:
        "temporal:" +
        [risk.leftSystem, risk.rightSystem]
          .sort()
          .join(":"),
    } satisfies NeedValidationAuditIssueProjection));

  return sortIssues([
    ...negative,
    ...temporal,
  ]);
}

export function projectClosureNeedValidationAuditIssues(
  closure: GameplayModelClosureResult,
): readonly NeedValidationAuditIssueProjection[] {
  const findings: NeedValidationAuditIssueProjection[] = [];

  for (const surface of closure.surfaces) {
    if (
      !surface.material ||
      (
        surface.status !== "unknown" &&
        surface.status !== "blocked"
      )
    ) {
      continue;
    }

    const isBoundary =
      surface.id.includes("capacity") ||
      (surface.boundaries?.length ?? 0) > 0;
    const flow: GameplayIssueFlowStage =
      isBoundary
        ? "READY_START"
        : surface.kind === "lifecycle"
          ? "RECOVERY"
          : surface.kind === "outcome"
            ? "TERMINAL"
            : surface.kind === "objective" ||
                surface.kind === "phase"
              ? "PROGRESSION"
              : "ACTIVE_GAMEPLAY";
    const failureDomain: GameplayIssueFailureDomain =
      surface.id.includes("arena")
        ? "arena-multi-arena"
        : surface.id.includes("inventory")
          ? "inventory-economy"
          : surface.id.includes("chunk")
            ? "chunk-simulation"
            : surface.id.includes("persist")
              ? "persistence-recovery"
              : isBoundary
                ? "boundary-capacity"
                : "state-ownership";

    findings.push({
      status: "NEED_VALIDATION",
      issueType: "BUG",
      failureDomain,
      contributingDomains: [failureDomain],
      gameplayFlow: flow,
      informationMismatch: false,
      playerFacingEvidenceIds: [],
      causalLinkId:
        "closure-surface:" + surface.id,
      scenarioId:
        "closure:" + surface.id,
      gameplayStage: flow,
      scenarioLabel: surface.label,
      gameplayTrigger:
        "Exercise the gameplay path that depends on " +
        surface.label +
        ".",
      gameplayConsequence:
        "A material gameplay surface remains unresolved, so defects inside this surface cannot yet be excluded.",
      expectedOutcome:
        "Material gameplay surface is understood well enough to prove or disprove its required behavior.",
      actualOutcome:
        surface.reason ??
        "Material gameplay surface remains unresolved.",
      affectedScope: surface.id,
      subjectIds: [surface.id],
      componentIds: [],
      evidenceIds: [
        ...new Set(
          surface.evidenceIds ?? [],
        ),
      ].sort(),
      validationReason:
        "Gameplay Model Closure marks this material surface as " +
        surface.status +
        ".",
      missingProof:
        "Decisive selected-artifact evidence for " +
        surface.label +
        ".",
      validationTest:
        "Exercise " +
        surface.label +
        " through its normal and failure/recovery path and verify the unresolved behavior described by the closure reason.",
      validationGroupKey:
        "closure-surface:" + surface.id,
    });
  }

  for (const id of closure.unaccountedSurfaceIds) {
    findings.push({
      status: "NEED_VALIDATION",
      issueType: "BUG",
      failureDomain: "state-ownership",
      contributingDomains: [
        "state-ownership",
      ],
      gameplayFlow: "ACTIVE_GAMEPLAY",
      informationMismatch: false,
      playerFacingEvidenceIds: [],
      causalLinkId:
        "unaccounted-surface:" + id,
      scenarioId:
        "unaccounted:" + id,
      gameplayStage: "ACTIVE_GAMEPLAY",
      scenarioLabel: "unaccounted-gameplay-surface",
      gameplayTrigger:
        "Locate and exercise the discovered gameplay surface " +
        id +
        ".",
      gameplayConsequence:
        "A discovered gameplay surface is absent from the closed gameplay model, so any defect in it could be missed entirely.",
      expectedOutcome:
        "Every discovered material surface has an explicit semantic owner and audit disposition.",
      actualOutcome:
        "The discovered surface is not accounted in Gameplay Model Closure.",
      affectedScope: id,
      subjectIds: [id],
      componentIds: [],
      evidenceIds: [],
      validationReason:
        "Discovered gameplay surface is unaccounted.",
      missingProof:
        "Semantic ownership, gameplay purpose, dependencies, and proof path for " +
        id +
        ".",
      validationTest:
        "Trace " +
        id +
        " from player trigger to state mutation and exit, then verify its success/failure behavior.",
      validationGroupKey:
        "unaccounted-surface:" + id,
    });
  }

  if (!closure.stateModelComplete) {
    findings.push({
      status: "NEED_VALIDATION",
      issueType: "BUG",
      failureDomain: "state-ownership",
      contributingDomains: [
        "state-ownership",
      ],
      gameplayFlow: "ACTIVE_GAMEPLAY",
      informationMismatch: false,
      playerFacingEvidenceIds: [],
      causalLinkId:
        "closure-gap:state-model",
      scenarioId:
        "closure:state-model",
      gameplayStage: "ACTIVE_GAMEPLAY",
      scenarioLabel: "state-model-closure",
      gameplayTrigger:
        "Exercise major gameplay state transitions across success, failure, retry, cleanup, and recovery.",
      gameplayConsequence:
        "Incomplete state modeling can hide stale-state, ownership, reset, and progression defects.",
      expectedOutcome:
        "All material states have create/read/write/clear ownership and lifecycle semantics.",
      actualOutcome:
        "Gameplay Model Closure reports stateModelComplete=false.",
      affectedScope: "gameplay-state-model",
      subjectIds: [],
      componentIds: [],
      evidenceIds: [],
      validationReason:
        "Major gameplay state/transition model is incomplete.",
      missingProof:
        "Complete state ownership and lifecycle coverage.",
      validationTest:
        "Trace every major state transition through success, failure, retry, cleanup, reconnect, and second-run paths; fail any transition with unowned or uncleared material state.",
      validationGroupKey:
        "closure:state-model",
    });
  }

  if (!closure.boundariesExtracted) {
    findings.push({
      status: "NEED_VALIDATION",
      issueType: "BUG",
      failureDomain: "boundary-capacity",
      contributingDomains: [
        "boundary-capacity",
      ],
      gameplayFlow: "READY_START",
      informationMismatch: false,
      playerFacingEvidenceIds: [],
      causalLinkId:
        "closure-gap:boundaries",
      scenarioId:
        "closure:boundaries",
      gameplayStage: "READY_START",
      scenarioLabel: "boundary-closure",
      gameplayTrigger:
        "Exercise material gameplay limits at first/minimum, maximum, and maximum+1 where applicable.",
      gameplayConsequence:
        "Unknown boundaries can hide capacity, final-wave, retry-limit, threshold, and off-by-one defects.",
      expectedOutcome:
        "Every material numeric/discrete gameplay limit has explicit below/at/above semantics.",
      actualOutcome:
        "Gameplay Model Closure reports boundariesExtracted=false.",
      affectedScope: "gameplay-boundaries",
      subjectIds: [],
      componentIds: [],
      evidenceIds: [],
      validationReason:
        "Material gameplay boundaries are not fully extracted.",
      missingProof:
        "Complete boundary registry and edge-case behavior.",
      validationTest:
        "Test each unresolved material boundary at N-1, N, and N+1 (or first/final equivalents) and verify the expected transition.",
      validationGroupKey:
        "closure:boundaries",
    });
  }

  const byId = new Map<string, NeedValidationAuditIssueProjection>();
  for (const item of findings) {
    if (!byId.has(item.causalLinkId)) {
      byId.set(item.causalLinkId, item);
    }
  }
  return sortIssues([...byId.values()]);
}
