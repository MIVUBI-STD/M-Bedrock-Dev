import type {
  SpatialCellSample,
  SpatialCoordinate,
  SpatialIgnoredVolume,
} from "./spatial-fingerprint.js";

export type SpatialDifferenceRelevance =
  | "gameplay"
  | "decorative"
  | "ignored"
  | "unknown";

export interface SpatialSemanticRegion {
  id: string;
  min: SpatialCoordinate;
  max: SpatialCoordinate;
  relevance: Exclude<SpatialDifferenceRelevance, "ignored">;
}

export interface SpatialCellDifference {
  coordinate: SpatialCoordinate;
  reference?: SpatialCellSample;
  target?: SpatialCellSample;
  relevance: SpatialDifferenceRelevance;
  regionId?: string;
}

export interface SpatialSemanticDiff {
  totalDifferences: number;
  gameplayDifferences: number;
  decorativeDifferences: number;
  ignoredDifferences: number;
  unknownDifferences: number;
  differences: readonly SpatialCellDifference[];
}

function key(sample: SpatialCellSample, origin: SpatialCoordinate): string {
  return [
    sample.x - origin.x,
    sample.y - origin.y,
    sample.z - origin.z,
    sample.layer ?? 0,
  ].join(",");
}

function inside(
  point: SpatialCoordinate,
  min: SpatialCoordinate,
  max: SpatialCoordinate,
): boolean {
  return (
    point.x >= Math.min(min.x, max.x) &&
    point.x <= Math.max(min.x, max.x) &&
    point.y >= Math.min(min.y, max.y) &&
    point.y <= Math.max(min.y, max.y) &&
    point.z >= Math.min(min.z, max.z) &&
    point.z <= Math.max(min.z, max.z)
  );
}

function stableStateEntries(
  sample?: SpatialCellSample,
): readonly [string, string | number | boolean][] {
  return Object.entries(sample?.states ?? {}).sort(([a], [b]) =>
    a.localeCompare(b)
  );
}

function equivalent(a?: SpatialCellSample, b?: SpatialCellSample): boolean {
  if (!a || !b) return a === b;
  return (
    a.blockIdentifier === b.blockIdentifier &&
    (a.layer ?? 0) === (b.layer ?? 0) &&
    JSON.stringify(stableStateEntries(a)) ===
      JSON.stringify(stableStateEntries(b))
  );
}

export function createSpatialSemanticDiff(
  reference: readonly SpatialCellSample[],
  target: readonly SpatialCellSample[],
  options: {
    referenceOrigin?: SpatialCoordinate;
    targetOrigin?: SpatialCoordinate;
    ignoredVolumes?: readonly SpatialIgnoredVolume[];
    semanticRegions?: readonly SpatialSemanticRegion[];
  } = {},
): SpatialSemanticDiff {
  const referenceOrigin = options.referenceOrigin ?? { x: 0, y: 0, z: 0 };
  const targetOrigin = options.targetOrigin ?? { x: 0, y: 0, z: 0 };
  const referenceByKey = new Map(reference.map((item) => [
    key(item, referenceOrigin),
    item,
  ]));
  const targetByKey = new Map(target.map((item) => [
    key(item, targetOrigin),
    item,
  ]));
  const allKeys = new Set([...referenceByKey.keys(), ...targetByKey.keys()]);
  const differences: SpatialCellDifference[] = [];

  for (const relativeKey of allKeys) {
    const a = referenceByKey.get(relativeKey);
    const b = targetByKey.get(relativeKey);
    if (equivalent(a, b)) continue;

    const [x, y, z] = relativeKey.split(",").map(Number);
    const coordinate = { x, y, z };

    const ignored = (options.ignoredVolumes ?? []).some((volume) =>
      inside(coordinate, volume.min, volume.max)
    );
    if (ignored) {
      differences.push({
        coordinate,
        ...(a ? { reference: a } : {}),
        ...(b ? { target: b } : {}),
        relevance: "ignored",
      });
      continue;
    }

    const region = (options.semanticRegions ?? []).find((item) =>
      inside(coordinate, item.min, item.max)
    );
    differences.push({
      coordinate,
      ...(a ? { reference: a } : {}),
      ...(b ? { target: b } : {}),
      relevance: region?.relevance ?? "unknown",
      ...(region ? { regionId: region.id } : {}),
    });
  }

  return {
    totalDifferences: differences.length,
    gameplayDifferences: differences.filter((item) => item.relevance === "gameplay").length,
    decorativeDifferences: differences.filter((item) => item.relevance === "decorative").length,
    ignoredDifferences: differences.filter((item) => item.relevance === "ignored").length,
    unknownDifferences: differences.filter((item) => item.relevance === "unknown").length,
    differences,
  };
}
