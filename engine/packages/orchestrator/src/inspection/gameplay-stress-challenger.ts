import type {
  GameplayWorldModel,
} from "./gameplay-world-model.js";

export interface GameplayStressChallengeSignal {
  readonly id: string;
  readonly kind:
    | "compound-boundary"
    | "monotonic-growth";
  readonly subjectId: string;
  readonly evidenceIds: readonly string[];
  readonly reason: string;
  readonly dimensions: readonly string[];
}

/**
 * Finds stress classes that are easy to miss with ordinary N-1/N/N+1 checks:
 * interacting capacity dimensions and state/resource growth across repeated runs.
 * Signals are proof pressure only; they never confirm a defect by themselves.
 */
export function challengeGameplayStress(
  world: GameplayWorldModel,
): readonly GameplayStressChallengeSignal[] {
  const output: GameplayStressChallengeSignal[] = [];

  if (
    world.arenas.detected &&
    world.arenas.count !== undefined &&
    world.arenas.perArenaPlayerCapacity !== undefined
  ) {
    const nominalPlayers =
      world.arenas.count *
      world.arenas.perArenaPlayerCapacity;
    const safeArenaPlayers =
      world.arenas.safeConcurrentArenas === undefined ||
      world.arenas.safeConcurrentArenas === null
        ? undefined
        : world.arenas.safeConcurrentArenas *
          world.arenas.perArenaPlayerCapacity;
    const declaredPlayers =
      world.arenas.declaredMaxConcurrentPlayers;

    if (
      (
        declaredPlayers !== undefined &&
        nominalPlayers !== declaredPlayers
      ) ||
      (
        safeArenaPlayers !== undefined &&
        safeArenaPlayers < nominalPlayers
      )
    ) {
      output.push({
        id: "stress-challenge:compound-boundary:arena-player-capacity",
        kind: "compound-boundary",
        subjectId: "runtime:arena-capacity",
        evidenceIds: [
          "world:arena-count",
          "capacity:safe-concurrency",
        ],
        reason:
          "Arena count and per-arena player capacity form a compound capacity boundary whose effective total differs from at least one visible/declared/safe capacity dimension. Single-dimensional N±1 testing can miss this interaction.",
        dimensions: [
          "arenaCount=" + String(world.arenas.count),
          "perArenaPlayerCapacity=" +
            String(world.arenas.perArenaPlayerCapacity),
          "nominalPlayers=" + String(nominalPlayers),
          ...(safeArenaPlayers === undefined
            ? []
            : [
                "safeArenaPlayers=" +
                  String(safeArenaPlayers),
              ]),
          ...(declaredPlayers === undefined
            ? []
            : [
                "declaredMaxConcurrentPlayers=" +
                  String(declaredPlayers),
              ]),
        ],
      });
    }
  }

  const growthDimensions: string[] = [];
  if ((world.persistence?.appendWithoutClear ?? 0) > 0) {
    growthDimensions.push(
      "persistence.appendWithoutClear=" +
        String(world.persistence?.appendWithoutClear ?? 0),
    );
  }
  if (world.chunks.acquireWithoutRelease > 0) {
    growthDimensions.push(
      "chunks.acquireWithoutRelease=" +
        String(world.chunks.acquireWithoutRelease),
    );
  }
  if (world.combat.projectileCleanupGap > 0) {
    growthDimensions.push(
      "combat.projectileCleanupGap=" +
        String(world.combat.projectileCleanupGap),
    );
  }
  if (world.economy.worldDropRewardPathsWithoutCleanup > 0) {
    growthDimensions.push(
      "economy.worldDropRewardPathsWithoutCleanup=" +
        String(
          world.economy.worldDropRewardPathsWithoutCleanup,
        ),
    );
  }
  if (world.arenas.cleanup.resourceLedger.missing > 0) {
    growthDimensions.push(
      "arena.cleanupMissing=" +
        String(
          world.arenas.cleanup.resourceLedger.missing,
        ),
    );
  }

  if (growthDimensions.length > 0) {
    output.push({
      id: "stress-challenge:monotonic-growth:repeated-run",
      kind: "monotonic-growth",
      subjectId: "runtime:repeated-run-growth",
      evidenceIds: [],
      reason:
        "One or more resources/state paths can grow or remain acquired without a matching per-run cleanup. A small repeated-run test may pass while later runs accumulate stale state/resources.",
      dimensions: growthDimensions.sort(),
    });
  }

  return output.sort((a, b) =>
    a.id.localeCompare(b.id)
  );
}
