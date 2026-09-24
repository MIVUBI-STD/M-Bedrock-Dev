import type { SourceRef } from "./source-ref.js";

export type RuntimeEvidenceState = "present" | "absent" | "unknown";
export type RuntimeEvidenceConfidence = "observed" | "derived" | "unknown";

export interface RuntimeObservationPoint {
  tick?: number;
  streamId?: string;
  sequence?: number;
  timestamp?: string;
}

export interface RuntimeScope {
  arenaId?: string;
  arenaGeneration?: number;
  playerKey?: string;
  connectionGeneration?: number;
  lifeGeneration?: number;
  entityKey?: string;
  entityGeneration?: number;
  operationId?: string;
  subsystemGeneration?: number;
}

export interface RuntimeEvidenceRecord {
  predicate: string;
  state: RuntimeEvidenceState;
  confidence: RuntimeEvidenceConfidence;
  scope?: RuntimeScope;
  sourceRefs?: readonly SourceRef[];
  relatedNodeIds?: readonly string[];
  observedAt?: RuntimeObservationPoint;
  note?: string;
}

export interface RuntimeEvidenceSnapshot {
  schemaVersion: 1;
  records: readonly RuntimeEvidenceRecord[];
}

function stableScopePart(value: string | number | undefined): string {
  return value === undefined ? "" : String(value);
}

export function runtimeScopeKey(scope: RuntimeScope | undefined): string {
  if (!scope) return "global";
  return [
    stableScopePart(scope.arenaId),
    stableScopePart(scope.arenaGeneration),
    stableScopePart(scope.playerKey),
    stableScopePart(scope.connectionGeneration),
    stableScopePart(scope.lifeGeneration),
    stableScopePart(scope.entityKey),
    stableScopePart(scope.entityGeneration),
    stableScopePart(scope.operationId),
    stableScopePart(scope.subsystemGeneration),
  ].join("|");
}

export function groupRuntimeEvidenceByScope(
  snapshot: RuntimeEvidenceSnapshot,
): ReadonlyMap<string, readonly RuntimeEvidenceRecord[]> {
  const groups = new Map<string, RuntimeEvidenceRecord[]>();
  for (const record of snapshot.records) {
    const key = runtimeScopeKey(record.scope);
    const list = groups.get(key) ?? [];
    list.push(record);
    groups.set(key, list);
  }
  return groups;
}
