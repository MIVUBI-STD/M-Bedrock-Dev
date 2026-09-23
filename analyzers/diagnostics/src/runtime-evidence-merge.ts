import type { KnowledgeEvidence, KnowledgeEvidenceMap } from "../../../packages/knowledge/src/evaluate.js";
import type { SourceRef } from "../../../packages/project-model/src/source-ref.js";
import type { RuntimeEvidenceRecord } from "../../../packages/project-model/src/runtime-evidence.js";

export interface MergedRuntimeEvidence {
  map: KnowledgeEvidenceMap;
  conflicts: readonly string[];
  sourceRefs: readonly SourceRef[];
  relatedNodeIds: readonly string[];
}

export function mergeRuntimeEvidenceRecords(
  records: readonly RuntimeEvidenceRecord[],
): MergedRuntimeEvidence {
  const map: Record<string, KnowledgeEvidence> = {};
  const conflicts: string[] = [];
  const sourceRefs: SourceRef[] = [];
  const relatedNodeIds = new Set<string>();

  for (const record of records) {
    for (const source of record.sourceRefs ?? []) sourceRefs.push(source);
    for (const nodeId of record.relatedNodeIds ?? []) relatedNodeIds.add(nodeId);

    const current = map[record.predicate];
    const sourceIds = record.sourceRefs?.map((source) =>
      source.artifactId + ":" + source.relativePath
    ) ?? [];

    if (!current) {
      map[record.predicate] = {
        state: record.state,
        sourceIds,
        ...(record.note === undefined ? {} : { note: record.note }),
      };
      continue;
    }

    const mergedSourceIds = [...new Set([
      ...(current.sourceIds ?? []),
      ...sourceIds,
    ])];

    if (current.state !== record.state) {
      map[record.predicate] = {
        state: "unknown",
        sourceIds: mergedSourceIds,
        note: "Conflicting runtime evidence states.",
      };
      conflicts.push(record.predicate);
      continue;
    }

    map[record.predicate] = {
      ...current,
      sourceIds: mergedSourceIds,
    };
  }

  return {
    map,
    conflicts: [...new Set(conflicts)].sort(),
    sourceRefs,
    relatedNodeIds: [...relatedNodeIds].sort(),
  };
}