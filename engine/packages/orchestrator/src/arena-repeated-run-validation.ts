export interface ArenaRepeatedRunValidationStage {
  runs: number;
  scope: "single-arena" | "all-arenas";
  invariants: readonly string[];
  compareSurfaces: readonly string[];
  purpose: string;
}

export interface ArenaRepeatedRunValidationPlan {
  schemaVersion: 1;
  runCounts: readonly number[];
  stages: readonly ArenaRepeatedRunValidationStage[];
}

const DEFAULT_RUN_COUNTS = [1, 2, 5, 20] as const;

export function deriveArenaRepeatedRunValidationPlan(
  runCounts: readonly number[] = DEFAULT_RUN_COUNTS,
): ArenaRepeatedRunValidationPlan {
  const normalized = [
    ...new Set(runCounts),
  ].sort((a, b) => a - b);

  if (
    normalized.length === 0 ||
    normalized.some(
      (value) =>
        !Number.isInteger(value) ||
        value < 1,
    )
  ) {
    throw new Error(
      "Arena repeated-run validation requires positive integer run counts.",
    );
  }

  const sharedInvariants = [
    "arena.cleanup-returns-baseline",
    "arena.membership-empty-after-cleanup",
    "arena.no-stale-generation-work",
    "arena.no-cross-arena-release",
    "multiplayer.assignment-consistency",
  ];

  const compareSurfaces = [
    "arena-membership",
    "entity-counts",
    "block-entities",
    "pending-random-ticks",
    "dynamic-properties",
    "scoreboards",
    "tags",
    "effects",
    "deferred-callbacks",
    "input-permissions",
    "world-global-leases",
  ];

  const stages = normalized.flatMap(
    (runs): ArenaRepeatedRunValidationStage[] => [{
      runs,
      scope: "single-arena",
      invariants: sharedInvariants,
      compareSurfaces,
      purpose:
        "Repeat one full-capacity arena session " +
        runs +
        " time(s) and prove cleanup returns the arena to its declared baseline after every cycle.",
    }, {
      runs,
      scope: "all-arenas",
      invariants: [
        ...sharedInvariants,
        "arena.cleanup-scope-isolation",
        "arena.cross-arena-start-independence",
      ],
      compareSurfaces,
      purpose:
        "Rotate repeated sessions across every arena for " +
        runs +
        " cycle(s) and prove no cumulative residue or cross-arena ownership leak.",
    }],
  );

  return {
    schemaVersion: 1,
    runCounts: normalized,
    stages,
  };
}
