export interface ArenaVector3 {
  x: number;
  y: number;
  z: number;
}

export interface ArenaReplicaItem {
  key: string;
  signature: string;
  position?: ArenaVector3;
  required?: boolean;
}

export interface ArenaReplicaSnapshot {
  arenaId: string;
  anchor: ArenaVector3;
  items: readonly ArenaReplicaItem[];
}

export type ArenaReplicaMismatchKind =
  | "duplicate-key"
  | "missing-item"
  | "unexpected-item"
  | "signature-mismatch"
  | "relative-position-mismatch";

export interface ArenaReplicaMismatch {
  kind: ArenaReplicaMismatchKind;
  key: string;
  message: string;
  expected?: unknown;
  actual?: unknown;
}

export interface ArenaReplicaComparison {
  referenceArenaId: string;
  targetArenaId: string;
  translation: ArenaVector3;
  ok: boolean;
  comparedItemCount: number;
  mismatches: readonly ArenaReplicaMismatch[];
}

export interface ArenaReplicaCompareOptions {
  positionTolerance?: number;
  reportUnexpectedItems?: boolean;
}

function subtract(a: ArenaVector3, b: ArenaVector3): ArenaVector3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function within(a: number, b: number, tolerance: number): boolean {
  return Math.abs(a - b) <= tolerance;
}

function sameVector(
  a: ArenaVector3,
  b: ArenaVector3,
  tolerance: number,
): boolean {
  return (
    within(a.x, b.x, tolerance) &&
    within(a.y, b.y, tolerance) &&
    within(a.z, b.z, tolerance)
  );
}

function groupByKey(
  items: readonly ArenaReplicaItem[],
): Map<string, ArenaReplicaItem[]> {
  const grouped = new Map<string, ArenaReplicaItem[]>();
  for (const item of items) {
    const bucket = grouped.get(item.key) ?? [];
    bucket.push(item);
    grouped.set(item.key, bucket);
  }
  return grouped;
}

export function compareArenaReplicas(
  reference: ArenaReplicaSnapshot,
  target: ArenaReplicaSnapshot,
  options: ArenaReplicaCompareOptions = {},
): ArenaReplicaComparison {
  const tolerance = options.positionTolerance ?? 0.0001;
  const referenceByKey = groupByKey(reference.items);
  const targetByKey = groupByKey(target.items);
  const mismatches: ArenaReplicaMismatch[] = [];

  for (const [key, items] of referenceByKey) {
    if (items.length > 1) {
      mismatches.push({
        kind: "duplicate-key",
        key,
        message: `Reference arena contains duplicate replica key: ${key}`,
        actual: items.length,
      });
    }
  }

  for (const [key, items] of targetByKey) {
    if (items.length > 1) {
      mismatches.push({
        kind: "duplicate-key",
        key,
        message: `Target arena contains duplicate replica key: ${key}`,
        actual: items.length,
      });
    }
  }

  let comparedItemCount = 0;

  for (const [key, referenceItems] of referenceByKey) {
    const referenceItem = referenceItems[0]!;
    const targetItem = targetByKey.get(key)?.[0];

    if (!targetItem) {
      if (referenceItem.required !== false) {
        mismatches.push({
          kind: "missing-item",
          key,
          message: `Required replica item is missing from target arena: ${key}`,
          expected: referenceItem,
        });
      }
      continue;
    }

    comparedItemCount += 1;

    if (referenceItem.signature !== targetItem.signature) {
      mismatches.push({
        kind: "signature-mismatch",
        key,
        message: `Replica item signature differs for ${key}`,
        expected: referenceItem.signature,
        actual: targetItem.signature,
      });
    }

    if (referenceItem.position && targetItem.position) {
      const expectedRelative = subtract(
        referenceItem.position,
        reference.anchor,
      );
      const actualRelative = subtract(
        targetItem.position,
        target.anchor,
      );

      if (!sameVector(expectedRelative, actualRelative, tolerance)) {
        mismatches.push({
          kind: "relative-position-mismatch",
          key,
          message: `Replica item relative position differs for ${key}`,
          expected: expectedRelative,
          actual: actualRelative,
        });
      }
    } else if (Boolean(referenceItem.position) !== Boolean(targetItem.position)) {
      mismatches.push({
        kind: "relative-position-mismatch",
        key,
        message: `Replica item position evidence is asymmetric for ${key}`,
        expected: referenceItem.position ?? null,
        actual: targetItem.position ?? null,
      });
    }
  }

  if (options.reportUnexpectedItems !== false) {
    for (const [key, targetItems] of targetByKey) {
      if (referenceByKey.has(key)) continue;
      mismatches.push({
        kind: "unexpected-item",
        key,
        message: `Target arena contains an item absent from the canonical arena: ${key}`,
        actual: targetItems[0],
      });
    }
  }

  return {
    referenceArenaId: reference.arenaId,
    targetArenaId: target.arenaId,
    translation: subtract(target.anchor, reference.anchor),
    ok: mismatches.length === 0,
    comparedItemCount,
    mismatches,
  };
}
