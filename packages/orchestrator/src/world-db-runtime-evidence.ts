import type { RuntimeEvidenceRecord } from "../../project-model/src/runtime-evidence.js";
import type { WorldDbNativeSummary } from "./world-db-analysis.js";

export function worldDbRuntimeEvidence(
  summary: WorldDbNativeSummary,
): RuntimeEvidenceRecord[] {
  const records: RuntimeEvidenceRecord[] = [];

  records.push({
    predicate: "world-db-native-scan",
    state: summary.status === "scanned"
      ? "present"
      : summary.status === "not-present" ? "absent" : "unknown",
    confidence: summary.status === "failed" ? "unknown" : "observed",
    note: summary.failure ?? summary.status,
  });

  if (summary.status !== "scanned") return records;

  if (summary.truncated) {
    records.push({
      predicate: "world-db-scan-complete",
      state: "absent",
      confidence: "observed",
      origin: "native",
      note: "Native LevelDB scan reached its inspection budget.",
    });
  } else {
    records.push({
      predicate: "world-db-scan-complete",
      state: "present",
      confidence: "observed",
      origin: "native",
    });
  }

  for (const chunk of summary.chunkSignals) {
    const scope = {
      operationId: "native-chunk:" + chunk.dimensionId + ":" + chunk.chunkX + ":" + chunk.chunkZ,
    };
    records.push({
      predicate: "world-db-chunk-record",
      state: "present",
      confidence: "observed",
      origin: "native",
      scope,
      note: "dimension=" + chunk.dimensionId + ";kinds=" + chunk.kinds.join(","),
    });

    if (chunk.kinds.includes("BlockEntity")) {
      records.push({
        predicate: "world-db-block-entity-record",
        state: "present",
        confidence: "observed",
      origin: "native",
        scope,
      });
    }
    if (chunk.kinds.includes("PendingTicks")) {
      records.push({
        predicate: "world-db-pending-tick-record",
        state: "present",
        confidence: "observed",
      origin: "native",
        scope,
      });
    }
    if (chunk.kinds.includes("RandomTicks")) {
      records.push({
        predicate: "world-db-random-tick-record",
        state: "present",
        confidence: "observed",
      origin: "native",
        scope,
      });
    }
  }

  return records;
}