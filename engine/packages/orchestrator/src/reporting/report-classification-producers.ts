import type {
  DiagnosticFinding,
} from "../../../diagnostics/src/index.js";
import type {
  ReportPrimaryFailureSignal,
} from "./report-defect-classification.js";

const FAILURE_BY_DIAGNOSTIC_CODE:
  Readonly<
    Partial<
      Record<
        DiagnosticFinding["code"],
        ReportPrimaryFailureSignal["failure"]
      >
    >
  > = {
    ARENA_CONCURRENCY_CAPACITY_SHORTFALL:
      "session-concurrency",
    ARENA_REPLICA_DIVERGENCE:
      "world-mutation",
    ARENA_SPATIAL_FINGERPRINT_DIVERGENCE:
      "world-mutation",
    ARENA_VOXEL_DIVERGENCE:
      "world-mutation",
    TOPOLOGY_TRANSLATION_OUTLIER:
      "world-mutation",
    ENTITY_SENSOR_EVENT_UNDEFINED:
      "entity-decision",
    ENTITY_TRIGGER_EVENT_UNDEFINED:
      "entity-decision",
    ENTITY_EVENT_COMPONENT_GROUP_UNDEFINED:
      "entity-decision",
    SCRIPT_API_VERSION_INCOMPATIBLE:
      "runtime-compatibility",
    SCRIPT_API_PRERELEASE_SYMBOL:
      "runtime-compatibility",
    SCRIPT_API_DEPRECATED_SYMBOL:
      "runtime-compatibility",
    SCRIPT_API_REMOVED_SYMBOL:
      "runtime-compatibility",
    SCRIPT_API_SIGNATURE_INCOMPATIBLE:
      "runtime-compatibility",
    SCRIPT_API_RETURN_CONTRACT_RISK:
      "runtime-compatibility",
    SCRIPT_API_PROPERTY_WRITE_INCOMPATIBLE:
      "runtime-compatibility",
    SCRIPT_API_ENUM_VALUE_INCOMPATIBLE:
      "runtime-compatibility",
    EDUCATION_FEATURE_DISABLED:
      "runtime-compatibility",
  };

export interface DiagnosticPrimaryFailureDerivation {
  readonly signals:
    readonly ReportPrimaryFailureSignal[];
  readonly unmappedFindingIds: readonly string[];
}

export function derivePrimaryFailureSignalsFromDiagnostics(
  findings: readonly DiagnosticFinding[],
): DiagnosticPrimaryFailureDerivation {
  const signals: ReportPrimaryFailureSignal[] = [];
  const unmappedFindingIds: string[] = [];

  for (const finding of findings) {
    const failure =
      FAILURE_BY_DIAGNOSTIC_CODE[finding.code];

    if (failure === undefined) {
      unmappedFindingIds.push(finding.id);
      continue;
    }

    signals.push({
      failure,
      evidenceIds: [finding.id],
    });
  }

  return {
    signals,
    unmappedFindingIds,
  };
}
