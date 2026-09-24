import type { DiagnosticFinding } from "../../diagnostics/src/index.js";
import type { RuntimeProbeResponse } from "../../project-model/src/runtime-probe.js";
import type { TelemetryEvent } from "../../project-model/src/telemetry.js";
import { analyzeTelemetryContinuity } from "../../project-model/src/telemetry-continuity.js";
import { telemetryRuntimeEvidence } from "./telemetry-evidence.js";
import { runtimeProbeResponseEvidence } from "./runtime-probe-evidence.js";
import { assessRuntimeEvidenceSetIntegrity } from "./runtime-evidence-integrity.js";
import { planEvidenceRecovery } from "./evidence-recovery.js";

export interface InspectionRuntimeEvidenceInput {
  telemetryEvents: readonly TelemetryEvent[];
  telemetryDroppedEvents: number;
  runtimeProbeResponses: readonly RuntimeProbeResponse[];
  runtimeProbeDroppedExchanges: number;
}

export function prepareInspectionRuntimeEvidence(
  input: InspectionRuntimeEvidenceInput,
) {
  const telemetryEvidence =
    telemetryRuntimeEvidence(input.telemetryEvents);
  const runtimeProbeEvidence =
    runtimeProbeResponseEvidence(input.runtimeProbeResponses);

  const telemetryContinuity = analyzeTelemetryContinuity({
    schemaVersion: 1,
    ...(input.telemetryDroppedEvents === 0
      ? {}
      : { droppedEvents: input.telemetryDroppedEvents }),
    events: input.telemetryEvents,
  });

  const telemetryEvidenceIntegrity =
    assessRuntimeEvidenceSetIntegrity(
      telemetryEvidence,
      telemetryContinuity,
    );

  const runtimeProbeEvidenceIntegrityBase =
    assessRuntimeEvidenceSetIntegrity(
      runtimeProbeEvidence.records,
    );

  const runtimeProbeEvidenceIntegrity =
    input.runtimeProbeDroppedExchanges === 0
      ? runtimeProbeEvidenceIntegrityBase
      : {
          ...runtimeProbeEvidenceIntegrityBase,
          continuityComplete: false,
          safeForTemporalViolationClaims: false,
          reasons: [
            ...runtimeProbeEvidenceIntegrityBase.reasons,
            "Runtime probe exchanges were dropped; missing probe observations cannot safely establish temporal absence or ordering.",
          ],
        };

  const evidenceRecovery = planEvidenceRecovery(
    telemetryEvidenceIntegrity,
    runtimeProbeEvidenceIntegrity,
  );

  const diagnostics: DiagnosticFinding[] = [];

  if (input.telemetryDroppedEvents > 0) {
    diagnostics.push({
      id: "diag_telemetry_dropped_" +
        input.telemetryDroppedEvents,
      code: "TELEMETRY_EVENTS_DROPPED",
      severity: "minor",
      message:
        "Runtime telemetry buffer dropped " +
        input.telemetryDroppedEvents +
        " event(s); causal/runtime evidence may be incomplete.",
      data: {
        droppedEvents: input.telemetryDroppedEvents,
      },
    });
  }

  if (telemetryContinuity.missingSequences > 0) {
    diagnostics.push({
      id: "diag_telemetry_sequence_gap_" +
        telemetryContinuity.missingSequences,
      code: "TELEMETRY_SEQUENCE_GAP",
      severity: "minor",
      message:
        "Telemetry sequence continuity has " +
        telemetryContinuity.missingSequences +
        " missing event sequence value(s).",
      data: {
        missingSequences: telemetryContinuity.missingSequences,
      },
    });
  }

  if (
    telemetryContinuity.duplicateSequences > 0 ||
    telemetryContinuity.nonMonotonicTransitions > 0
  ) {
    diagnostics.push({
      id: "diag_telemetry_sequence_conflict_" +
        telemetryContinuity.duplicateSequences +
        "_" +
        telemetryContinuity.nonMonotonicTransitions,
      code: "TELEMETRY_SEQUENCE_CONFLICT",
      severity: "medium",
      message:
        "Telemetry sequence order contains duplicate or non-monotonic values; event ordering evidence is unreliable.",
      data: {
        duplicateSequences:
          telemetryContinuity.duplicateSequences,
        nonMonotonicTransitions:
          telemetryContinuity.nonMonotonicTransitions,
      },
    });
  }

  if (telemetryContinuity.unidentifiedStreamEvents > 0) {
    diagnostics.push({
      id: "diag_telemetry_stream_unidentified_" +
        telemetryContinuity.unidentifiedStreamEvents,
      code: "TELEMETRY_STREAM_UNIDENTIFIED",
      severity: "info",
      message:
        "Sequenced telemetry events are missing streamId; continuity cannot distinguish independent emitters.",
      data: {
        unidentifiedStreamEvents:
          telemetryContinuity.unidentifiedStreamEvents,
      },
    });
  }

  if (input.runtimeProbeDroppedExchanges > 0) {
    diagnostics.push({
      id:
        "diag_runtime_probe_dropped_" +
        input.runtimeProbeDroppedExchanges,
      code: "RUNTIME_PROBE_EXCHANGES_DROPPED",
      severity: "minor",
      message:
        "Runtime probe transcript dropped " +
        input.runtimeProbeDroppedExchanges +
        " exchange(s); runtime proof coverage is incomplete.",
      data: {
        droppedExchanges:
          input.runtimeProbeDroppedExchanges,
      },
    });
  }

  return {
    telemetryEvidence,
    runtimeProbeEvidence,
    telemetryContinuity,
    telemetryEvidenceIntegrity,
    runtimeProbeEvidenceIntegrity,
    evidenceRecovery,
    diagnostics,
  };
}
