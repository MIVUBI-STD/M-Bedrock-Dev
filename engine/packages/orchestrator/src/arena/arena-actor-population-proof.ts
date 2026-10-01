import {
  classifyBedrockLevelDbKey,
  decodeBedrockActorRecord,
  type BedrockLevelDbReader,
} from "../../../../adapters/leveldb/src/index.js";
import type {
  ArenaRegionPlan,
  ArenaSpatialLayoutSource,
  ArenaVector3,
  Translation3,
} from "../../../../analyzers/topology/src/index.js";

export type ArenaActorPopulationProofStatus =
  | "verified"
  | "diverged"
  | "incomplete"
  | "budget-exceeded"
  | "not-available";

export interface ArenaActorPopulationMismatch {
  identifier: string;
  canonicalCount: number;
  replicaCount: number;
}

export interface ArenaActorPopulationReplicaProof {
  arenaId: string;
  status: ArenaActorPopulationProofStatus;
  canonicalActors: number;
  replicaActors: number;
  mismatchCount: number;
  mismatches: readonly ArenaActorPopulationMismatch[];
}

export interface ArenaActorPopulationProof {
  status: ArenaActorPopulationProofStatus;
  actorRecordsScanned: number;
  decodedActorRecords: number;
  unresolvedActorRecords: number;
  outsideArenaActors: number;
  ignoredIdentifiers: readonly string[];
  canonicalActors: number;
  replicas: readonly ArenaActorPopulationReplicaProof[];
}

export interface ArenaActorPopulationProofOptions {
  maxActorRecords?: number;
  ignoredIdentifiers?: readonly string[];
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

function inside(
  point: ArenaVector3,
  volumes: readonly {
    min: ArenaVector3;
    max: ArenaVector3;
  }[],
): boolean {
  return volumes.some((volume) =>
    point.x >= volume.min.x &&
    point.x <= volume.max.x &&
    point.y >= volume.min.y &&
    point.y <= volume.max.y &&
    point.z >= volume.min.z &&
    point.z <= volume.max.z
  );
}

function contexts(
  layout: ArenaSpatialLayoutSource,
): Array<{
  arenaId: string;
  offset: Translation3;
}> {
  return [{
    arenaId: layout.canonical.arenaId,
    offset: { x: 0, y: 0, z: 0 },
  }, ...layout.replicas.map((replica, index) => ({
    arenaId: replica.arenaId,
    offset:
      layout.offsets[index] ??
      { x: 0, y: 0, z: 0 },
  }))];
}

function totalCount(
  counts: ReadonlyMap<string, number>,
): number {
  return [...counts.values()].reduce(
    (sum, value) => sum + value,
    0,
  );
}

export async function proveArenaActorPopulation(
  reader: BedrockLevelDbReader,
  layout: ArenaSpatialLayoutSource,
  regionPlan: ArenaRegionPlan | undefined,
  options: ArenaActorPopulationProofOptions = {},
): Promise<ArenaActorPopulationProof> {
  const ignoredIdentifiers = [
    ...new Set(
      options.ignoredIdentifiers ?? [
        "minecraft:player",
      ],
    ),
  ].sort();
  const ignored = new Set(ignoredIdentifiers);

  if (!regionPlan) {
    return {
      status: "not-available",
      actorRecordsScanned: 0,
      decodedActorRecords: 0,
      unresolvedActorRecords: 0,
      outsideArenaActors: 0,
      ignoredIdentifiers,
      canonicalActors: 0,
      replicas: layout.replicas.map((replica) => ({
        arenaId: replica.arenaId,
        status: "not-available",
        canonicalActors: 0,
        replicaActors: 0,
        mismatchCount: 0,
        mismatches: [],
      })),
    };
  }

  const maxActorRecords =
    options.maxActorRecords ?? 50_000;
  const arenaContexts = contexts(layout);
  const countsByArena = new Map<
    string,
    Map<string, number>
  >(
    arenaContexts.map((context) => [
      context.arenaId,
      new Map<string, number>(),
    ]),
  );

  let actorRecordsScanned = 0;
  let decodedActorRecords = 0;
  let unresolvedActorRecords = 0;
  let outsideArenaActors = 0;
  let budgetExceeded = false;

  for await (const entry of reader.entries()) {
    const classified =
      classifyBedrockLevelDbKey(entry.key);
    if (classified.family !== "actor") {
      continue;
    }

    if (actorRecordsScanned >= maxActorRecords) {
      budgetExceeded = true;
      break;
    }
    actorRecordsScanned += 1;

    try {
      const actor =
        await decodeBedrockActorRecord(
          entry.value,
        );
      if (
        !actor.identifier ||
        !actor.position
      ) {
        unresolvedActorRecords += 1;
        continue;
      }
      decodedActorRecords += 1;

      if (ignored.has(actor.identifier)) {
        continue;
      }

      const matches = arenaContexts.filter(
        (context) =>
          inside(
            actor.position!,
            translatedVolumes(
              regionPlan,
              context.offset,
            ),
          ),
      );

      if (matches.length === 0) {
        outsideArenaActors += 1;
        continue;
      }
      if (matches.length !== 1) {
        unresolvedActorRecords += 1;
        continue;
      }

      const target =
        countsByArena.get(
          matches[0]!.arenaId,
        )!;
      target.set(
        actor.identifier,
        (target.get(actor.identifier) ?? 0) + 1,
      );
    } catch {
      unresolvedActorRecords += 1;
    }
  }

  const canonicalCounts =
    countsByArena.get(
      layout.canonical.arenaId,
    ) ?? new Map<string, number>();
  const canonicalActors =
    totalCount(canonicalCounts);

  const replicas =
    layout.replicas.map(
      (replica): ArenaActorPopulationReplicaProof => {
        const replicaCounts =
          countsByArena.get(replica.arenaId) ??
          new Map<string, number>();
        const identifiers = new Set([
          ...canonicalCounts.keys(),
          ...replicaCounts.keys(),
        ]);
        const mismatches =
          [...identifiers]
            .sort()
            .flatMap(
              (identifier):
                ArenaActorPopulationMismatch[] => {
                const canonicalCount =
                  canonicalCounts.get(identifier) ?? 0;
                const replicaCount =
                  replicaCounts.get(identifier) ?? 0;
                return canonicalCount === replicaCount
                  ? []
                  : [{
                      identifier,
                      canonicalCount,
                      replicaCount,
                    }];
              },
            );

        return {
          arenaId: replica.arenaId,
          status:
            budgetExceeded
              ? "budget-exceeded"
              : mismatches.length > 0
                ? "diverged"
                : unresolvedActorRecords > 0
                  ? "incomplete"
                  : "verified",
          canonicalActors,
          replicaActors:
            totalCount(replicaCounts),
          mismatchCount: mismatches.length,
          mismatches,
        };
      },
    );

  return {
    status:
      budgetExceeded
        ? "budget-exceeded"
        : replicas.some(
            (item) =>
              item.status === "diverged",
          )
          ? "diverged"
          : unresolvedActorRecords > 0
            ? "incomplete"
            : "verified",
    actorRecordsScanned,
    decodedActorRecords,
    unresolvedActorRecords,
    outsideArenaActors,
    ignoredIdentifiers,
    canonicalActors,
    replicas,
  };
}
