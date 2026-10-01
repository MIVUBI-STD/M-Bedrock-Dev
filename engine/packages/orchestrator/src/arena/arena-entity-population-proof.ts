import { createHash } from "node:crypto";
import type {
  ArenaRegionPlan,
  ArenaSpatialLayoutSource,
  ArenaVector3,
  ResolvedEffect,
  Translation3,
} from "../../../../analyzers/topology/src/index.js";

export type ArenaEntityPopulationProofStatus =
  | "verified"
  | "diverged"
  | "incomplete"
  | "not-available";

export interface ArenaEntitySpawnRecord {
  arenaId: string;
  entityIdentifier: string;
  relativePosition: ArenaVector3;
  signature: string;
}

export interface ArenaEntityPopulationMismatch {
  kind: "missing" | "unexpected";
  signature: string;
}

export interface ArenaEntityPopulationReplicaProof {
  arenaId: string;
  status: ArenaEntityPopulationProofStatus;
  canonicalSpawns: number;
  replicaSpawns: number;
  unresolvedSpawns: number;
  mismatches: readonly ArenaEntityPopulationMismatch[];
}

export interface ArenaEntityPopulationProof {
  status: ArenaEntityPopulationProofStatus;
  canonicalSpawns: readonly ArenaEntitySpawnRecord[];
  unresolvedSpawns: number;
  replicas: readonly ArenaEntityPopulationReplicaProof[];
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

function relative(
  point: ArenaVector3,
  anchor: ArenaVector3,
): ArenaVector3 {
  return {
    x: point.x - anchor.x,
    y: point.y - anchor.y,
    z: point.z - anchor.z,
  };
}

function signature(
  entityIdentifier: string,
  position: ArenaVector3,
): string {
  return createHash("sha256")
    .update(JSON.stringify({
      entityIdentifier,
      position,
    }))
    .digest("hex")
    .slice(0, 24);
}

function contexts(
  layout: ArenaSpatialLayoutSource,
): Array<{
  arenaId: string;
  anchor: ArenaVector3;
  offset: Translation3;
}> {
  return [
    {
      arenaId: layout.canonical.arenaId,
      anchor: layout.canonical.anchor,
      offset: { x: 0, y: 0, z: 0 },
    },
    ...layout.replicas.map((replica, index) => ({
      arenaId: replica.arenaId,
      anchor: replica.anchor,
      offset:
        layout.offsets[index] ??
        { x: 0, y: 0, z: 0 },
    })),
  ];
}

export function proveArenaEntityPopulation(
  layout: ArenaSpatialLayoutSource,
  regionPlan: ArenaRegionPlan | undefined,
  effects: readonly ResolvedEffect[],
): ArenaEntityPopulationProof {
  const spawns = effects.filter(
    (
      effect,
    ): effect is Extract<
      ResolvedEffect,
      { kind: "entity-spawn" }
    > => effect.kind === "entity-spawn",
  );

  if (!regionPlan) {
    return {
      status: "not-available",
      canonicalSpawns: [],
      unresolvedSpawns: spawns.length,
      replicas: layout.replicas.map((replica) => ({
        arenaId: replica.arenaId,
        status: "not-available",
        canonicalSpawns: 0,
        replicaSpawns: 0,
        unresolvedSpawns: spawns.length,
        mismatches: [],
      })),
    };
  }

  const arenaContexts = contexts(layout);
  const assigned = new Map<string, ArenaEntitySpawnRecord[]>(
    arenaContexts.map((context) => [
      context.arenaId,
      [],
    ]),
  );
  let unresolvedSpawns = 0;

  for (const spawn of spawns) {
    const matches = arenaContexts.filter((context) =>
      inside(
        spawn.position,
        translatedVolumes(regionPlan, context.offset),
      )
    );
    if (matches.length !== 1) {
      unresolvedSpawns += 1;
      continue;
    }

    const context = matches[0]!;
    const relativePosition = relative(
      spawn.position,
      context.anchor,
    );
    assigned.get(context.arenaId)!.push({
      arenaId: context.arenaId,
      entityIdentifier: spawn.entityIdentifier,
      relativePosition,
      signature: signature(
        spawn.entityIdentifier,
        relativePosition,
      ),
    });
  }

  for (const list of assigned.values()) {
    list.sort((a, b) =>
      a.signature.localeCompare(b.signature)
    );
  }

  const canonical =
    assigned.get(layout.canonical.arenaId) ?? [];
  const expected = new Map<string, number>();
  for (const item of canonical) {
    expected.set(
      item.signature,
      (expected.get(item.signature) ?? 0) + 1,
    );
  }

  const replicas = layout.replicas.map((replica) => {
    const current =
      assigned.get(replica.arenaId) ?? [];
    const actual = new Map<string, number>();
    for (const item of current) {
      actual.set(
        item.signature,
        (actual.get(item.signature) ?? 0) + 1,
      );
    }

    const mismatches: ArenaEntityPopulationMismatch[] = [];
    const keys = new Set([
      ...expected.keys(),
      ...actual.keys(),
    ]);
    for (const key of [...keys].sort()) {
      const expectedCount = expected.get(key) ?? 0;
      const actualCount = actual.get(key) ?? 0;
      for (
        let index = actualCount;
        index < expectedCount;
        index += 1
      ) {
        mismatches.push({
          kind: "missing",
          signature: key,
        });
      }
      for (
        let index = expectedCount;
        index < actualCount;
        index += 1
      ) {
        mismatches.push({
          kind: "unexpected",
          signature: key,
        });
      }
    }

    return {
      arenaId: replica.arenaId,
      status:
        mismatches.length > 0
          ? "diverged" as const
          : unresolvedSpawns > 0
            ? "incomplete" as const
            : "verified" as const,
      canonicalSpawns: canonical.length,
      replicaSpawns: current.length,
      unresolvedSpawns,
      mismatches,
    };
  });

  return {
    status:
      replicas.some(
        (item) => item.status === "diverged",
      )
        ? "diverged"
        : unresolvedSpawns > 0 ||
            replicas.some(
              (item) => item.status === "incomplete",
            )
          ? "incomplete"
          : "verified",
    canonicalSpawns: canonical,
    unresolvedSpawns,
    replicas,
  };
}
