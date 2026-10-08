import type {
  ArenaRegionPlan,
  ArenaSpatialLayoutSource,
  ArenaVector3,
  Translation3,
} from "../../../../analyzers/topology/src/index.js";
import type {
  ArenaAuthoredSpatialSource,
} from "./arena-authored-source-index.js";
import type {
  ArenaVoxelProof,
} from "./arena-voxel-proof.js";
import type {
  ArenaStructureInstanceProof,
} from "./arena-structure-instance-proof.js";
import type {
  ArenaEntityPopulationProof,
} from "./arena-entity-population-proof.js";
import type {
  ArenaActorPopulationProof,
} from "./arena-actor-population-proof.js";

export type ArenaRepairLocalizationKind =
  | "voxel"
  | "structure-instance"
  | "entity-population"
  | "actor-population";

export type ArenaRepairLocalizationStrength =
  | "exact-overlap"
  | "arena-overlap"
  | "surface-only";

export interface ArenaRepairSourceCandidate {
  sourceId: string;
  source: ArenaAuthoredSpatialSource["source"];
  sourceKind: ArenaAuthoredSpatialSource["sourceKind"];
  authoredKind: ArenaAuthoredSpatialSource["kind"];
  strength: ArenaRepairLocalizationStrength;
  reason: string;
}

export interface ArenaRepairLocalizationItem {
  kind: ArenaRepairLocalizationKind;
  arenaId: string;
  candidates: readonly ArenaRepairSourceCandidate[];
  unresolved: boolean;
  reasons: readonly string[];
}

export interface ArenaRepairLocalization {
  items: readonly ArenaRepairLocalizationItem[];
  localized: number;
  unresolved: number;
}

function translatePoint(
  point: ArenaVector3,
  offset: Translation3,
): ArenaVector3 {
  return {
    x: point.x + offset.x,
    y: point.y + offset.y,
    z: point.z + offset.z,
  };
}

function translatedVolumes(
  plan: ArenaRegionPlan,
  offset: Translation3,
) {
  return plan.volumes.map((volume) => ({
    min: translatePoint(volume.min, offset),
    max: translatePoint(volume.max, offset),
  }));
}

function volumesOverlap(
  a: { min: ArenaVector3; max: ArenaVector3 },
  b: { min: ArenaVector3; max: ArenaVector3 },
): boolean {
  return !(
    a.max.x < b.min.x ||
    b.max.x < a.min.x ||
    a.max.y < b.min.y ||
    b.max.y < a.min.y ||
    a.max.z < b.min.z ||
    b.max.z < a.min.z
  );
}

function pointInside(
  point: ArenaVector3,
  volume: { min: ArenaVector3; max: ArenaVector3 },
): boolean {
  return (
    point.x >= volume.min.x &&
    point.x <= volume.max.x &&
    point.y >= volume.min.y &&
    point.y <= volume.max.y &&
    point.z >= volume.min.z &&
    point.z <= volume.max.z
  );
}

function arenaContexts(
  layout: ArenaSpatialLayoutSource,
): Array<{
  arenaId: string;
  offset: Translation3;
}> {
  return [{
    arenaId: layout.canonical.arenaId,
    offset: { x: 0, y: 0, z: 0 },
  }, ...layout.replicas.flatMap((replica, index) => {
    const offset = layout.offsets[index];
    return offset === undefined ? [] : [{
      arenaId: replica.arenaId,
      offset,
    }];
  })];
}

function sourceOverlappingArenaIds(
  source: ArenaAuthoredSpatialSource,
  layout: ArenaSpatialLayoutSource,
  plan: ArenaRegionPlan,
): string[] {
  const sourceVolume =
    source.volume ??
    (source.position === undefined
      ? undefined
      : {
          min: source.position,
          max: source.position,
        });
  if (!sourceVolume) return [];

  return arenaContexts(layout)
    .filter((context) =>
      translatedVolumes(plan, context.offset)
        .some((volume) =>
          volumesOverlap(
            sourceVolume,
            volume,
          )
        )
    )
    .map((context) => context.arenaId)
    .sort();
}

function candidate(
  source: ArenaAuthoredSpatialSource,
  strength: ArenaRepairLocalizationStrength,
  reason: string,
): ArenaRepairSourceCandidate {
  return {
    sourceId: source.id,
    source: source.source,
    sourceKind: source.sourceKind,
    authoredKind: source.kind,
    strength,
    reason,
  };
}

function dedupe(
  values: readonly ArenaRepairSourceCandidate[],
): ArenaRepairSourceCandidate[] {
  const rank: Readonly<
    Record<ArenaRepairLocalizationStrength, number>
  > = {
    "surface-only": 0,
    "arena-overlap": 1,
    "exact-overlap": 2,
  };

  return [
    ...new Map(
      [...values]
        .sort((a, b) =>
          rank[b.strength] -
            rank[a.strength] ||
          a.sourceId.localeCompare(b.sourceId)
        )
        .reverse()
        .map((item) => [
          item.sourceId,
          item,
        ]),
    ).values(),
  ].sort((a, b) =>
    rank[b.strength] -
      rank[a.strength] ||
    a.source.relativePath.localeCompare(
      b.source.relativePath,
    ) ||
    (a.source.range?.lineStart ?? 0) -
      (b.source.range?.lineStart ?? 0)
  );
}

export function localizeArenaRepairSources(
  input: {
    layout: ArenaSpatialLayoutSource;
    regionPlan: ArenaRegionPlan;
    sources: readonly ArenaAuthoredSpatialSource[];
    voxelProof?: ArenaVoxelProof;
    structureProof?: ArenaStructureInstanceProof;
    entityPopulationProof?: ArenaEntityPopulationProof;
    actorPopulationProof?: ArenaActorPopulationProof;
  },
): ArenaRepairLocalization {
  const overlappingArenaIdsBySource = new Map(
    input.sources.map((source) => [
      source.id,
      sourceOverlappingArenaIds(
        source,
        input.layout,
        input.regionPlan,
      ),
    ]),
  );
  const items: ArenaRepairLocalizationItem[] = [];

  for (
    const replica of
      input.voxelProof?.replicas ?? []
  ) {
    if (replica.status !== "diverged") continue;

    const exact = input.sources.flatMap((source) => {
      if (!source.volume) return [];
      const overlaps =
        replica.mismatches.some(
          (mismatch) =>
            pointInside(
              mismatch.canonical,
              source.volume!,
            ) ||
            pointInside(
              mismatch.replica,
              source.volume!,
            ),
        );
      return overlaps
        ? [
            candidate(
              source,
              "exact-overlap",
              "Authored spatial mutation overlaps at least one decoded voxel mismatch coordinate.",
            ),
          ]
        : [];
    });

    const regional = input.sources
      .filter((source) =>
        (
          source.kind === "fill" ||
          source.kind === "setblock" ||
          source.kind === "clone" ||
          source.kind === "structure-load" ||
          source.kind === "structure-place"
        ) &&
        (
          overlappingArenaIdsBySource.get(source.id)?.includes(
            replica.arenaId,
          ) === true ||
          overlappingArenaIdsBySource.get(source.id)?.includes(
            input.layout.canonical.arenaId,
          ) === true
        )
      )
      .map((source) =>
        candidate(
          source,
          "arena-overlap",
          "Authored spatial source overlaps the canonical or diverged arena region; ownership is not established.",
        )
      );

    const candidates = dedupe([
      ...exact,
      ...regional,
    ]);
    items.push({
      kind: "voxel",
      arenaId: replica.arenaId,
      candidates,
      unresolved: candidates.length === 0,
      reasons:
        candidates.length === 0
          ? [
              "No authored block/structure source could be localized to the voxel divergence.",
            ]
          : exact.length > 0
            ? [
                "At least one authored source directly overlaps decoded mismatch coordinates.",
              ]
            : [
                "Only arena-region overlap is available; exact mutation ownership is not yet proven.",
              ],
    });
  }

  for (
    const replica of
      input.structureProof?.replicas ?? []
  ) {
    if (replica.status !== "diverged") continue;
    const candidates = dedupe(
      input.sources
        .filter((source) =>
          (
            source.kind === "structure-load" ||
            source.kind === "structure-place"
          ) &&
          (
            overlappingArenaIdsBySource.get(source.id)?.includes(
              replica.arenaId,
            ) === true ||
            overlappingArenaIdsBySource.get(source.id)?.includes(
              input.layout.canonical.arenaId,
            ) === true
          )
        )
        .map((source) =>
          candidate(
            source,
            "arena-overlap",
            "Structure placement source overlaps the canonical or diverged arena region; ownership is not established.",
          )
        ),
    );
    items.push({
      kind: "structure-instance",
      arenaId: replica.arenaId,
      candidates,
      unresolved: candidates.length === 0,
      reasons:
        candidates.length === 0
          ? [
              "No authored structure placement source could be localized.",
            ]
          : [
              "Structure placement sources were selected by arena-region overlap; exact instance attribution and ownership remain unproven.",
            ],
    });
  }

  for (
    const replica of
      input.entityPopulationProof?.replicas ?? []
  ) {
    if (replica.status !== "diverged") continue;
    const candidates = dedupe(
      input.sources
        .filter((source) =>
          source.kind === "entity-spawn" &&
          (
            overlappingArenaIdsBySource.get(source.id)?.includes(
              replica.arenaId,
            ) === true ||
            overlappingArenaIdsBySource.get(source.id)?.includes(
              input.layout.canonical.arenaId,
            ) === true
          )
        )
        .map((source) =>
          candidate(
            source,
            "arena-overlap",
            "Authored entity spawn source overlaps the canonical or diverged arena region; ownership is not established.",
          )
        ),
    );
    items.push({
      kind: "entity-population",
      arenaId: replica.arenaId,
      candidates,
      unresolved: candidates.length === 0,
      reasons:
        candidates.length === 0
          ? [
              "No authored entity-spawn source could be localized.",
            ]
          : [
              "Entity-spawn sources were selected by arena-region overlap; exact mismatch attribution and ownership remain unproven.",
            ],
    });
  }

  for (
    const replica of
      input.actorPopulationProof?.replicas ?? []
  ) {
    if (replica.status !== "diverged") continue;
    const identifiers = new Set(
      replica.mismatches.map(
        (item) => item.identifier,
      ),
    );
    const candidates = dedupe(
      input.sources
        .filter((source) =>
          source.kind === "entity-spawn" &&
          (
            source.identifier === undefined ||
            identifiers.has(source.identifier)
          ) &&
          (
            overlappingArenaIdsBySource.get(source.id)?.includes(
              replica.arenaId,
            ) === true ||
            overlappingArenaIdsBySource.get(source.id)?.includes(
              input.layout.canonical.arenaId,
            ) === true
          )
        )
        .map((source) =>
          candidate(
            source,
            source.identifier !== undefined &&
            identifiers.has(source.identifier)
              ? "arena-overlap"
              : "surface-only",
            "Authored entity-spawn source matches the affected runtime actor identifier or overlaps an arena region; ownership is not established.",
          )
        ),
    );
    items.push({
      kind: "actor-population",
      arenaId: replica.arenaId,
      candidates,
      unresolved: candidates.length === 0,
      reasons:
        candidates.length === 0
          ? [
              "Runtime Actor DB divergence could not be attributed to an authored spawn source.",
            ]
          : [
              "Runtime actor population was linked to authored entity-spawn candidates; runtime despawn/movement systems may still be causal.",
            ],
    });
  }

  return {
    items,
    localized: items.filter(
      (item) => !item.unresolved,
    ).length,
    unresolved: items.filter(
      (item) => item.unresolved,
    ).length,
  };
}
