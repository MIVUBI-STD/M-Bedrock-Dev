export type MultiplayerStressScenarioKind =
  | "full-capacity-session"
  | "capacity-overflow"
  | "disconnect-during-setup"
  | "disconnect-during-active"
  | "death-during-join"
  | "reconnect-after-disconnect"
  | "simultaneous-all-arena-start"
  | "simultaneous-all-arena-finish"
  | "cleanup-start-overlap"
  | "staggered-full-join";

export interface MultiplayerStressScenario {
  id: string;
  kind: MultiplayerStressScenarioKind;
  arenaIds: readonly string[];
  playerIds: readonly string[];
  attemptedPlayers?: number;
  invariants: readonly string[];
  purpose: string;
}

export interface MultiplayerStressMatrix {
  schemaVersion: 1;
  arenaIds: readonly string[];
  playersPerArena: number;
  totalNominalPlayers: number;
  scenarios: readonly MultiplayerStressScenario[];
  byKind: Readonly<Record<MultiplayerStressScenarioKind, number>>;
}

export interface MultiplayerStressMatrixInput {
  arenaIds: readonly string[];
  playersPerArena: number;
}

const KINDS: readonly MultiplayerStressScenarioKind[] = [
  "full-capacity-session",
  "capacity-overflow",
  "disconnect-during-setup",
  "disconnect-during-active",
  "death-during-join",
  "reconnect-after-disconnect",
  "simultaneous-all-arena-start",
  "simultaneous-all-arena-finish",
  "cleanup-start-overlap",
  "staggered-full-join",
];

function players(
  arenaId: string,
  count: number,
): string[] {
  return Array.from(
    { length: count },
    (_, index) =>
      arenaId + ":player-" + (index + 1),
  );
}

function scenario(
  input: Omit<
    MultiplayerStressScenario,
    "id"
  > & { suffix: string },
): MultiplayerStressScenario {
  return {
    id:
      "multiplayer-stress:" +
      input.kind +
      ":" +
      input.suffix,
    kind: input.kind,
    arenaIds: input.arenaIds,
    playerIds: input.playerIds,
    ...(input.attemptedPlayers === undefined
      ? {}
      : {
          attemptedPlayers:
            input.attemptedPlayers,
        }),
    invariants: input.invariants,
    purpose: input.purpose,
  };
}

export function buildMultiplayerStressMatrix(
  input: MultiplayerStressMatrixInput,
): MultiplayerStressMatrix {
  const arenaIds = [
    ...new Set(input.arenaIds),
  ].sort();

  if (arenaIds.length < 1) {
    throw new Error(
      "Multiplayer stress matrix requires at least one arena.",
    );
  }
  if (
    !Number.isInteger(input.playersPerArena) ||
    input.playersPerArena < 1
  ) {
    throw new Error(
      "playersPerArena must be a positive integer.",
    );
  }

  const scenarios: MultiplayerStressScenario[] = [];

  for (const arenaId of arenaIds) {
    const full = players(
      arenaId,
      input.playersPerArena,
    );
    const primary = full[0]!;

    scenarios.push(
      scenario({
        kind: "full-capacity-session",
        suffix: arenaId,
        arenaIds: [arenaId],
        playerIds: full,
        invariants: [
          "multiplayer.assignment-consistency",
          "multiplayer.playing-requires-active-session",
          "arena.capacity-boundary",
          "arena.cleanup-returns-baseline",
        ],
        purpose:
          "Run one arena at declared full player capacity through join, start, active play, terminal cleanup, and lobby return.",
      }),
      scenario({
        kind: "capacity-overflow",
        suffix: arenaId,
        arenaIds: [arenaId],
        playerIds: [
          ...full,
          arenaId + ":overflow-player",
        ],
        attemptedPlayers:
          input.playersPerArena + 1,
        invariants: [
          "arena.capacity-boundary",
          "multiplayer.state-isolation",
        ],
        purpose:
          "Attempt one player above declared capacity and prove membership remains bounded.",
      }),
      scenario({
        kind: "disconnect-during-setup",
        suffix: arenaId,
        arenaIds: [arenaId],
        playerIds: [primary],
        invariants: [
          "multiplayer.disconnect-resets-progress",
          "arena.stale-setup-self-cancels",
          "arena.cleanup-returns-baseline",
        ],
        purpose:
          "Disconnect one participant after assignment/setup begins but before active play.",
      }),
      scenario({
        kind: "disconnect-during-active",
        suffix: arenaId,
        arenaIds: [arenaId],
        playerIds: [primary],
        invariants: [
          "multiplayer.disconnect-resets-progress",
          "arena.membership-release-or-retention-policy",
          "arena.no-stale-active-callbacks",
        ],
        purpose:
          "Disconnect one active participant and verify generation/session ownership prevents stale mutation.",
      }),
      scenario({
        kind: "death-during-join",
        suffix: arenaId,
        arenaIds: [arenaId],
        playerIds: [primary],
        invariants: [
          "arena.life-generation-invalidates-pending-join",
          "multiplayer.assignment-consistency",
        ],
        purpose:
          "Kill/respawn a player while a deferred join transition is pending.",
      }),
      scenario({
        kind: "reconnect-after-disconnect",
        suffix: arenaId,
        arenaIds: [arenaId],
        playerIds: [primary],
        invariants: [
          "arena.connection-generation-invalidates-stale-work",
          "multiplayer.disconnect-resets-progress",
          "multiplayer.assignment-consistency",
        ],
        purpose:
          "Reconnect the same logical participant under a new connection generation and prove old async work cannot commit.",
      }),
    );
  }

  const allPlayers = arenaIds.flatMap(
    (arenaId) =>
      players(
        arenaId,
        input.playersPerArena,
      ),
  );

  scenarios.push(
    scenario({
      kind: "simultaneous-all-arena-start",
      suffix: "all",
      arenaIds,
      playerIds: allPlayers,
      invariants: [
        "arena.single-start-owner-per-generation",
        "arena.cross-arena-start-independence",
        "multiplayer.state-isolation",
      ],
      purpose:
        "Issue near-simultaneous start requests across every arena while each arena is at declared full capacity.",
    }),
    scenario({
      kind: "simultaneous-all-arena-finish",
      suffix: "all",
      arenaIds,
      playerIds: allPlayers,
      invariants: [
        "arena.cleanup-scope-isolation",
        "arena.cleanup-returns-baseline",
        "arena.no-cross-arena-release",
      ],
      purpose:
        "Finish every arena in the same scheduling window and verify cleanup remains arena/generation scoped.",
    }),
    scenario({
      kind: "staggered-full-join",
      suffix: "all",
      arenaIds,
      playerIds: allPlayers,
      invariants: [
        "arena.capacity-boundary",
        "multiplayer.assignment-consistency",
        "multiplayer.state-isolation",
      ],
      purpose:
        "Fill every arena with interleaved joins to expose shared queue, shared selector, and cross-arena membership bugs.",
    }),
  );

  if (arenaIds.length > 1) {
    for (
      let index = 0;
      index < arenaIds.length;
      index += 1
    ) {
      const ending = arenaIds[index]!;
      const starting =
        arenaIds[(index + 1) % arenaIds.length]!;
      scenarios.push(
        scenario({
          kind: "cleanup-start-overlap",
          suffix:
            ending + "-to-" + starting,
          arenaIds: [ending, starting],
          playerIds: [
            ...players(
              ending,
              input.playersPerArena,
            ),
            ...players(
              starting,
              input.playersPerArena,
            ),
          ],
          invariants: [
            "arena.cleanup-scope-isolation",
            "arena.generation-non-overlap",
            "arena.cross-arena-start-independence",
          ],
          purpose:
            "Overlap terminal cleanup in one arena with setup/start in another to expose shared leases, broad selectors, or global reset state.",
        }),
      );
    }
  }

  const byKind = Object.fromEntries(
    KINDS.map((kind) => [
      kind,
      scenarios.filter(
        (item) => item.kind === kind,
      ).length,
    ]),
  ) as Record<
    MultiplayerStressScenarioKind,
    number
  >;

  return {
    schemaVersion: 1,
    arenaIds,
    playersPerArena:
      input.playersPerArena,
    totalNominalPlayers:
      arenaIds.length *
      input.playersPerArena,
    scenarios: scenarios.sort((a, b) =>
      a.id.localeCompare(b.id)
    ),
    byKind,
  };
}
