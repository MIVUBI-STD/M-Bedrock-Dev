import type {
  GameplayWorldModel,
} from "./gameplay-world-model.js";

export interface CompoundBoundarySignal {
  readonly id: string;
  readonly dimensions: readonly string[];
  readonly evidenceIds: readonly string[];
  readonly reason: string;
}

export interface AccumulationGrowthSignal {
  readonly id: string;
  readonly subjectId: string;
  readonly evidenceIds: readonly string[];
  readonly reason: string;
}

export function analyzeCompoundBoundaries(
  world: GameplayWorldModel,
): readonly CompoundBoundarySignal[] {
  const output: CompoundBoundarySignal[] = [];

  if (
    world.arenas.detected &&
    world.arenas.count !== undefined &&
    world.arenas.perArenaPlayerCapacity !== undefined
  ) {
    const nominalPlayers =
      world.arenas.count *
      world.arenas.perArenaPlayerCapacity;
    const effectiveArenaLimit =
      world.arenas.safeConcurrentArenas ??
      world.arenas.declaredConcurrentArenaLimit;
    const effectivePlayers =
      effectiveArenaLimit === undefined
        ? undefined
        : effectiveArenaLimit *
          world.arenas.perArenaPlayerCapacity;

    if (
      effectivePlayers !== undefined &&
      effectivePlayers < nominalPlayers
    ) {
      output.push({
        id: "compound-boundary:arena-x-players",
        dimensions: [
          "arenaCount=" + String(world.arenas.count),
          "playersPerArena=" +
            String(world.arenas.perArenaPlayerCapacity),
          "effectiveArenaLimit=" +
            String(effectiveArenaLimit),
          "nominalPlayers=" +
            String(nominalPlayers),
          "effectivePlayers=" +
            String(effectivePlayers),
        ],
        evidenceIds: [
          "world:arena-count",
          "capacity:safe-concurrency",
        ],
        reason:
          "Visible arena count and per-arena player capacity compose to a larger nominal multiplayer capacity than the grounded concurrent implementation limit. Pairwise/single-axis tests may miss the combined boundary.",
      });
    }
  }

  if (
    world.arenas.detected &&
    (world.arenas.count ?? 0) > 1
  ) {
    const staticLeaseKeys = [
      ...new Set(
        world.chunks.leases
          .map((lease) => lease.leaseKey)
          .filter(
            (leaseKey): leaseKey is string =>
              typeof leaseKey === "string" &&
              leaseKey.trim().length > 0,
          ),
      ),
    ].sort();

    for (const leaseKey of staticLeaseKeys) {
      const leases = world.chunks.leases.filter(
        (lease) => lease.leaseKey === leaseKey,
      );
      const lifecycleOwned = leases.some(
        (lease) =>
          lease.acquireRegions.length > 0 &&
          lease.releaseRegions.length > 0,
      );
      if (!lifecycleOwned) continue;

      output.push({
        id:
          "compound-boundary:multi-arena-static-lease:" +
          leaseKey,
        dimensions: [
          "arenas=" + String(world.arenas.count ?? 0),
          "leaseKey=" + leaseKey,
          "leaseOwners=" +
            String(
              new Set(
                leases.map((lease) => lease.scriptId),
              ).size,
            ),
        ],
        evidenceIds: [
          "analysis:chunk-simulation",
        ],
        reason:
          "A multi-arena artifact acquires and releases a literal named simulation resource. Prove the resource is intentionally shared/serialized or arena-namespaced; otherwise one arena lifecycle can remove or replace another arena's active lease.",
      });
    }
  }

  if (
    world.chunks.capacityUncheckedLeases > 0 &&
    world.arenas.detected &&
    (world.arenas.count ?? 0) > 1
  ) {
    output.push({
      id: "compound-boundary:arena-x-ticking-capacity",
      dimensions: [
        "arenas=" +
          String(world.arenas.count ?? 0),
        "capacityUncheckedLeases=" +
          String(world.chunks.capacityUncheckedLeases),
      ],
      evidenceIds: ["analysis:chunk-simulation"],
      reason:
        "Multiple arenas share simulation resources while one or more leases lack grounded capacity checks. Safe behavior may depend on the combination of active arenas and simulation leases rather than either dimension alone.",
    });
  }

  return output.sort((a, b) =>
    a.id.localeCompare(b.id)
  );
}

export function analyzeAccumulationGrowth(
  world: GameplayWorldModel,
): readonly AccumulationGrowthSignal[] {
  const output: AccumulationGrowthSignal[] = [];

  for (const property of
    world.persistence?.propertiesDetail ?? []) {
    if (
      property.growth === "append-without-clear" &&
      (
        property.lifetime === "round" ||
        property.lifetime === "match" ||
        property.lifetime === "player-session" ||
        property.lifetime === "unknown"
      )
    ) {
      output.push({
        id:
          "accumulation:persistence:" +
          property.scriptId +
          ":" +
          property.propertyId,
        subjectId: property.propertyId,
        evidenceIds: [
          "analysis:persistence-recovery",
        ],
        reason:
          "Persistent state appends without a grounded clear path for a finite or unresolved lifecycle. Repeated runs can accumulate stale state even if the first few runs appear healthy.",
      });
    }
  }

  if (
    world.chunks.tickingAreaAcquires >
      world.chunks.tickingAreaReleases
  ) {
    output.push({
      id: "accumulation:ticking-lease-balance",
      subjectId: "runtime:chunks",
      evidenceIds: ["analysis:chunk-simulation"],
      reason:
        "Observed ticking/simulation acquisition count exceeds release count in the selected-artifact model. Repeated sessions may accumulate residency resources unless another grounded cleanup path balances the lifecycle.",
    });
  }

  if (
    world.economy.worldDropRewardPathsWithoutCleanup > 0
  ) {
    output.push({
      id: "accumulation:world-drop-rewards",
      subjectId: "runtime:economy",
      evidenceIds: ["analysis:economy-reward"],
      reason:
        "Reward paths can create world drops without a grounded cleanup path, so repeated gameplay may accumulate stale reward entities/items.",
    });
  }

  return output
    .filter(
      (item, index, all) =>
        all.findIndex(
          (candidate) => candidate.id === item.id,
        ) === index,
    )
    .sort((a, b) => a.id.localeCompare(b.id));
}
