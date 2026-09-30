import type {
  ArenaReplicaComparison,
  ArenaReplicaMismatch,
} from "./arena-replica.js";

export type ArenaCanonicalEvidenceLayer =
  | "script-config"
  | "structure"
  | "world-db"
  | "runtime";

export interface ArenaCanonicalLayerComparison {
  layer: ArenaCanonicalEvidenceLayer;
  comparison: ArenaReplicaComparison;
}

export interface ArenaCanonicalException {
  key: string;
  mismatchKind?: ArenaReplicaMismatch["kind"];
  layer?: ArenaCanonicalEvidenceLayer;
  reason: string;
}

export interface ArenaCanonicalMismatchEvidence {
  key: string;
  kind: ArenaReplicaMismatch["kind"];
  layers: readonly ArenaCanonicalEvidenceLayer[];
  messages: readonly string[];
  expected: readonly unknown[];
  actual: readonly unknown[];
}

export interface ArenaCanonicalProof {
  referenceArenaId: string;
  targetArenaId: string;
  status: "proven-equivalent" | "divergent" | "conflicted" | "unknown";
  evidenceLayers: readonly ArenaCanonicalEvidenceLayer[];
  mismatches: readonly ArenaCanonicalMismatchEvidence[];
  exceptedMismatchCount: number;
}

function mismatchIdentity(
  mismatch: ArenaReplicaMismatch,
): string {
  return mismatch.kind + "::" + mismatch.key;
}

function isExcepted(
  layer: ArenaCanonicalEvidenceLayer,
  mismatch: ArenaReplicaMismatch,
  exceptions: readonly ArenaCanonicalException[],
): boolean {
  return exceptions.some((exception) =>
    exception.key === mismatch.key &&
    (exception.mismatchKind === undefined ||
      exception.mismatchKind === mismatch.kind) &&
    (exception.layer === undefined ||
      exception.layer === layer)
  );
}

export function proveArenaCanonicalEquivalence(
  layers: readonly ArenaCanonicalLayerComparison[],
  exceptions: readonly ArenaCanonicalException[] = [],
): ArenaCanonicalProof {
  if (layers.length === 0) {
    return {
      referenceArenaId: "",
      targetArenaId: "",
      status: "unknown",
      evidenceLayers: [],
      mismatches: [],
      exceptedMismatchCount: 0,
    };
  }

  const first = layers[0]!.comparison;
  const activeLayers = layers.filter(
    (layer) =>
      layer.comparison.referenceArenaId === first.referenceArenaId &&
      layer.comparison.targetArenaId === first.targetArenaId,
  );

  const grouped = new Map<
    string,
    {
      mismatch: ArenaReplicaMismatch;
      layers: ArenaCanonicalEvidenceLayer[];
      messages: string[];
      expected: unknown[];
      actual: unknown[];
    }
  >();
  let exceptedMismatchCount = 0;

  for (const layer of activeLayers) {
    for (const mismatch of layer.comparison.mismatches) {
      if (isExcepted(layer.layer, mismatch, exceptions)) {
        exceptedMismatchCount += 1;
        continue;
      }
      const id = mismatchIdentity(mismatch);
      const current = grouped.get(id) ?? {
        mismatch,
        layers: [],
        messages: [],
        expected: [],
        actual: [],
      };
      current.layers.push(layer.layer);
      current.messages.push(mismatch.message);
      if (mismatch.expected !== undefined) {
        current.expected.push(mismatch.expected);
      }
      if (mismatch.actual !== undefined) {
        current.actual.push(mismatch.actual);
      }
      grouped.set(id, current);
    }
  }

  const mismatches: ArenaCanonicalMismatchEvidence[] =
    [...grouped.values()]
      .map((item) => ({
        key: item.mismatch.key,
        kind: item.mismatch.kind,
        layers: [...new Set(item.layers)].sort(),
        messages: [...new Set(item.messages)],
        expected: item.expected,
        actual: item.actual,
      }))
      .sort((a, b) =>
        a.key.localeCompare(b.key) ||
        a.kind.localeCompare(b.kind)
      );

  const anyLayerOk = activeLayers.some(
    (layer) => layer.comparison.ok,
  );
  const anyLayerMismatch = activeLayers.some(
    (layer) =>
      layer.comparison.mismatches.some(
        (mismatch) =>
          !isExcepted(layer.layer, mismatch, exceptions),
      ),
  );

  const status =
    mismatches.length === 0
      ? "proven-equivalent"
      : anyLayerOk && anyLayerMismatch
        ? "conflicted"
        : "divergent";

  return {
    referenceArenaId: first.referenceArenaId,
    targetArenaId: first.targetArenaId,
    status,
    evidenceLayers: activeLayers.map((item) => item.layer),
    mismatches,
    exceptedMismatchCount,
  };
}
