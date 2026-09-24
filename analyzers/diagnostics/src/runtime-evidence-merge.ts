import type { KnowledgeEvidence, KnowledgeEvidenceMap } from "../../../packages/knowledge/src/index.js";
import type { SourceRef } from "../../../packages/project-model/src/source-ref.js";
import type {
  RuntimeEvidenceConfidence,
  RuntimeEvidenceRecord,
  RuntimeObservationPoint,
} from "../../../packages/project-model/src/runtime-evidence.js";

export interface RuntimeEvidenceConflictResolution {
  predicate: string;
  previousState: RuntimeEvidenceRecord["state"];
  incomingState: RuntimeEvidenceRecord["state"];
  resolution:
    | "incoming-newer"
    | "previous-newer"
    | "higher-confidence-same-moment"
    | "unresolved";
}

export interface MergedRuntimeEvidence {
  map: KnowledgeEvidenceMap;
  conflicts: readonly string[];
  resolvedConflicts: readonly RuntimeEvidenceConflictResolution[];
  sourceRefs: readonly SourceRef[];
  relatedNodeIds: readonly string[];
}

type FreshnessOrder = "before" | "same" | "after" | "unresolved";

function compareObservation(
  left: RuntimeObservationPoint | undefined,
  right: RuntimeObservationPoint | undefined,
): FreshnessOrder {
  if (!left || !right) return "unresolved";

  if (
    left.streamId !== undefined &&
    right.streamId !== undefined &&
    left.streamId === right.streamId &&
    left.sequence !== undefined &&
    right.sequence !== undefined
  ) {
    if (left.sequence < right.sequence) return "before";
    if (left.sequence > right.sequence) return "after";
    return "same";
  }

  if (left.tick !== undefined && right.tick !== undefined) {
    if (left.tick < right.tick) return "before";
    if (left.tick > right.tick) return "after";
    return "same";
  }

  if (left.timestamp !== undefined && right.timestamp !== undefined) {
    const a = Date.parse(left.timestamp);
    const b = Date.parse(right.timestamp);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      if (a < b) return "before";
      if (a > b) return "after";
      return "same";
    }
  }

  return "unresolved";
}

const confidenceRank: Readonly<Record<RuntimeEvidenceConfidence, number>> = {
  unknown: 0,
  derived: 1,
  observed: 2,
};

function evidenceForRecord(
  record: RuntimeEvidenceRecord,
  sourceIds: readonly string[],
  note = record.note,
): KnowledgeEvidence {
  return {
    state: record.state,
    sourceIds,
    ...(note === undefined ? {} : { note }),
  };
}

export function mergeRuntimeEvidenceRecords(
  records: readonly RuntimeEvidenceRecord[],
): MergedRuntimeEvidence {
  const map: Record<string, KnowledgeEvidence> = {};
  const latest = new Map<string, RuntimeEvidenceRecord>();
  const conflicts: string[] = [];
  const resolvedConflicts: RuntimeEvidenceConflictResolution[] = [];
  const sourceRefs: SourceRef[] = [];
  const relatedNodeIds = new Set<string>();

  for (const record of records) {
    for (const source of record.sourceRefs ?? []) sourceRefs.push(source);
    for (const nodeId of record.relatedNodeIds ?? []) relatedNodeIds.add(nodeId);

    const current = map[record.predicate];
    const currentRecord = latest.get(record.predicate);
    const sourceIds = record.sourceRefs?.map((source) =>
      source.artifactId + ":" + source.relativePath
    ) ?? [];

    if (!current || !currentRecord) {
      map[record.predicate] = evidenceForRecord(record, sourceIds);
      latest.set(record.predicate, record);
      continue;
    }

    const mergedSourceIds = [...new Set([
      ...(current.sourceIds ?? []),
      ...sourceIds,
    ])];

    if (current.state === record.state) {
      const order = compareObservation(
        currentRecord.observedAt,
        record.observedAt,
      );
      if (order === "before") {
        latest.set(record.predicate, record);
      } else if (
        order === "same" &&
        confidenceRank[record.confidence] >
          confidenceRank[currentRecord.confidence]
      ) {
        latest.set(record.predicate, record);
      }
      map[record.predicate] = {
        ...current,
        sourceIds: mergedSourceIds,
      };
      continue;
    }

    const order = compareObservation(
      currentRecord.observedAt,
      record.observedAt,
    );

    if (order === "before") {
      map[record.predicate] = evidenceForRecord(
        record,
        mergedSourceIds,
        "Newer comparable runtime evidence supersedes an older conflicting state.",
      );
      latest.set(record.predicate, record);
      resolvedConflicts.push({
        predicate: record.predicate,
        previousState: currentRecord.state,
        incomingState: record.state,
        resolution: "incoming-newer",
      });
      continue;
    }

    if (order === "after") {
      map[record.predicate] = {
        ...current,
        sourceIds: mergedSourceIds,
        note:
          "A newer comparable runtime observation already supersedes an older conflicting state.",
      };
      resolvedConflicts.push({
        predicate: record.predicate,
        previousState: currentRecord.state,
        incomingState: record.state,
        resolution: "previous-newer",
      });
      continue;
    }

    if (order === "same") {
      const currentConfidence = confidenceRank[currentRecord.confidence];
      const incomingConfidence = confidenceRank[record.confidence];
      if (incomingConfidence !== currentConfidence) {
        const winner = incomingConfidence > currentConfidence
          ? record
          : currentRecord;
        map[record.predicate] = evidenceForRecord(
          winner,
          mergedSourceIds,
          "Conflicting same-moment evidence resolved by stronger evidence confidence.",
        );
        latest.set(record.predicate, winner);
        resolvedConflicts.push({
          predicate: record.predicate,
          previousState: currentRecord.state,
          incomingState: record.state,
          resolution: "higher-confidence-same-moment",
        });
        continue;
      }
    }

    map[record.predicate] = {
      state: "unknown",
      sourceIds: mergedSourceIds,
      note:
        "Conflicting runtime evidence states cannot be safely ordered or resolved.",
    };
    conflicts.push(record.predicate);
    resolvedConflicts.push({
      predicate: record.predicate,
      previousState: currentRecord.state,
      incomingState: record.state,
      resolution: "unresolved",
    });
  }

  return {
    map,
    conflicts: [...new Set(conflicts)].sort(),
    resolvedConflicts,
    sourceRefs,
    relatedNodeIds: [...relatedNodeIds].sort(),
  };
}
