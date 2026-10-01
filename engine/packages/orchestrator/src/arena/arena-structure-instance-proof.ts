import { createHash } from "node:crypto";
import type {
  ArenaRegionPlan,
  ArenaSpatialLayoutSource,
  ArenaVector3,
  Translation3,
} from "../../../../analyzers/topology/src/index.js";

export interface ArenaStructurePlacementEvidence {
  target?: string;
  position?: ArenaVector3;
  options?: Readonly<Record<string, unknown>>;
  sourceKind: "command" | "script";
}

export type ArenaStructureInstanceProofStatus =
  | "verified"
  | "diverged"
  | "incomplete"
  | "not-available";

export interface ArenaStructureInstance {
  arenaId: string;
  target: string;
  relativePosition: ArenaVector3;
  signature: string;
  sourceKind: "command" | "script";
}

export interface ArenaStructureInstanceMismatch {
  kind: "missing" | "unexpected";
  signature: string;
}

export interface ArenaStructureInstanceReplicaProof {
  arenaId: string;
  status: ArenaStructureInstanceProofStatus;
  canonicalInstances: number;
  replicaInstances: number;
  unresolvedPlacements: number;
  mismatches: readonly ArenaStructureInstanceMismatch[];
}

export interface ArenaStructureInstanceProof {
  status: ArenaStructureInstanceProofStatus;
  canonicalInstances: readonly ArenaStructureInstance[];
  unresolvedPlacements: number;
  replicas: readonly ArenaStructureInstanceReplicaProof[];
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

function stable(
  value: unknown,
): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, stable(item)]),
    );
  }
  return value;
}

function stableSignature(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(stable(value)))
    .digest("hex")
    .slice(0, 24);
}

function arenaContexts(
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

export function proveArenaStructureInstances(
  layout: ArenaSpatialLayoutSource,
  regionPlan: ArenaRegionPlan | undefined,
  placements: readonly ArenaStructurePlacementEvidence[],
): ArenaStructureInstanceProof {
  if (!regionPlan) {
    return {
      status: "not-available",
      canonicalInstances: [],
      unresolvedPlacements: placements.length,
      replicas: layout.replicas.map((replica) => ({
        arenaId: replica.arenaId,
        status: "not-available",
        canonicalInstances: 0,
        replicaInstances: 0,
        unresolvedPlacements: placements.length,
        mismatches: [],
      })),
    };
  }

  const contexts = arenaContexts(layout);
  const assigned = new Map<string, ArenaStructureInstance[]>(
    contexts.map((context) => [context.arenaId, []]),
  );
  let unresolvedPlacements = 0;

  for (const placement of placements) {
    if (!placement.position || !placement.target) {
      unresolvedPlacements += 1;
      continue;
    }

    const matches = contexts.filter((context) =>
      inside(
        placement.position!,
        translatedVolumes(regionPlan, context.offset),
      )
    );
    if (matches.length !== 1) {
      unresolvedPlacements += 1;
      continue;
    }

    const context = matches[0]!;
    const relativePosition = relative(
      placement.position,
      context.anchor,
    );
    const signature = stableSignature({
      target: placement.target,
      relativePosition,
      options: placement.options ?? {},
    });

    assigned.get(context.arenaId)!.push({
      arenaId: context.arenaId,
      target: placement.target,
      relativePosition,
      signature,
      sourceKind: placement.sourceKind,
    });
  }

  for (const list of assigned.values()) {
    list.sort((a, b) =>
      a.signature.localeCompare(b.signature)
    );
  }

  const canonical =
    assigned.get(layout.canonical.arenaId) ?? [];
  const canonicalSignatures = new Map<string, number>();
  for (const item of canonical) {
    canonicalSignatures.set(
      item.signature,
      (canonicalSignatures.get(item.signature) ?? 0) + 1,
    );
  }

  const replicas = layout.replicas.map((replica) => {
    const current = assigned.get(replica.arenaId) ?? [];
    const currentSignatures = new Map<string, number>();
    for (const item of current) {
      currentSignatures.set(
        item.signature,
        (currentSignatures.get(item.signature) ?? 0) + 1,
      );
    }

    const mismatches: ArenaStructureInstanceMismatch[] = [];
    const all = new Set([
      ...canonicalSignatures.keys(),
      ...currentSignatures.keys(),
    ]);
    for (const signature of [...all].sort()) {
      const expected =
        canonicalSignatures.get(signature) ?? 0;
      const actual =
        currentSignatures.get(signature) ?? 0;
      for (let index = actual; index < expected; index += 1) {
        mismatches.push({
          kind: "missing",
          signature,
        });
      }
      for (let index = expected; index < actual; index += 1) {
        mismatches.push({
          kind: "unexpected",
          signature,
        });
      }
    }

    return {
      arenaId: replica.arenaId,
      status:
        mismatches.length > 0
          ? "diverged" as const
          : unresolvedPlacements > 0
            ? "incomplete" as const
            : "verified" as const,
      canonicalInstances: canonical.length,
      replicaInstances: current.length,
      unresolvedPlacements,
      mismatches,
    };
  });

  return {
    status:
      replicas.some((item) => item.status === "diverged")
        ? "diverged"
        : unresolvedPlacements > 0 ||
            replicas.some(
              (item) => item.status === "incomplete",
            )
          ? "incomplete"
          : "verified",
    canonicalInstances: canonical,
    unresolvedPlacements,
    replicas,
  };
}
