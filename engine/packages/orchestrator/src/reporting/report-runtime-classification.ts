import type {
  RuntimeExperimentDefinition,
} from "../../../runtime-lab/src/index.js";
import type {
  RuntimeExperimentDiagnosticBridge,
} from "../diagnosis/runtime-experiment-diagnostic-evidence.js";
import type {
  ReportImpactSignal,
  ReportPrimaryFailureSignal,
} from "./report-defect-classification.js";

const IMPACT_BY_PRESENT_FAILURE_PREDICATE:
  Readonly<Record<string, ReportImpactSignal["kind"]>> = {
    "stale-join-transition-observed":
      "important-state-wrong",
    "stale-session-mutation-observed":
      "important-state-wrong",
    "stale-life-join-mutation-observed":
      "important-state-wrong",
    "arena-capacity-overflow-observed":
      "important-state-wrong",
    "arena-session-invariant-violation-observed":
      "important-state-wrong",
    "arena-start-ownership-violation-observed":
      "important-state-wrong",
    "cancelled-callback-mutation-observed":
      "important-state-wrong",
    "cross-arena-mutation-observed":
      "important-state-wrong",
    "stale-callback-observed":
      "important-state-wrong",
    "navigation-stall-observed":
      "core-mechanic-wrong",
  };

const FAILURE_BY_RUNTIME_DOMAIN:
  Readonly<
    Partial<
      Record<
        RuntimeExperimentDefinition["domain"],
        ReportPrimaryFailureSignal["failure"]
      >
    >
  > = {
    multiplayer: "session-concurrency",
    "entity-ai": "entity-decision",
    compatibility: "runtime-compatibility",
  };

export interface RuntimeExperimentClassificationDerivation {
  readonly impact:
    readonly ReportImpactSignal[];
  readonly primaryFailure:
    readonly ReportPrimaryFailureSignal[];
  readonly unmappedPresentPredicateIds:
    readonly string[];
}

export function deriveReportClassificationFromRuntimeExperiment(
  definition: RuntimeExperimentDefinition,
  bridge: RuntimeExperimentDiagnosticBridge,
): RuntimeExperimentClassificationDerivation {
  if (definition.id !== bridge.experimentId) {
    throw new Error(
      "Runtime experiment definition and diagnostic bridge must have the same experiment id.",
    );
  }

  const impact: ReportImpactSignal[] = [];
  const unmappedPresentPredicateIds: string[] = [];

  for (const predicate of bridge.predicates) {
    if (
      predicate.observation.state !== "present" ||
      predicate.ceiling === "unknown"
    ) {
      continue;
    }

    const kind =
      IMPACT_BY_PRESENT_FAILURE_PREDICATE[
        predicate.predicate
      ];

    if (kind === undefined) {
      unmappedPresentPredicateIds.push(
        predicate.predicate,
      );
      continue;
    }

    if (predicate.sourceEvidenceIds.length === 0) {
      continue;
    }

    impact.push({
      kind,
      evidenceIds: predicate.sourceEvidenceIds,
    });
  }

  const failure =
    FAILURE_BY_RUNTIME_DOMAIN[definition.domain];
  const failureEvidenceIds = [
    ...new Set(
      impact.flatMap((signal) =>
        signal.evidenceIds
      ),
    ),
  ].sort();

  return {
    impact,
    primaryFailure:
      failure === undefined ||
      failureEvidenceIds.length === 0
        ? []
        : [{
            failure,
            evidenceIds: failureEvidenceIds,
          }],
    unmappedPresentPredicateIds:
      [...new Set(unmappedPresentPredicateIds)]
        .sort(),
  };
}
