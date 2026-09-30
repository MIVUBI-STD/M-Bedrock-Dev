import { world } from "@minecraft/server";
import {
  captureBaselineSurfaces,
  compareBaselineSurfaces,
} from "./baseline-surface.js";

function findPlayer(playerKey) {
  return world
    .getAllPlayers()
    .find(
      (player) =>
        player.id === playerKey ||
        player.name === playerKey
    );
}

function playersInArena(arenaId) {
  return world
    .getAllPlayers()
    .filter((player) =>
      player
        .getTags()
        .includes(
          "arena:" + arenaId
        )
    );
}

function resetSessionTags(player) {
  for (const tag of [
    "session:starting",
    "session:playing",
    "session:completed",
    "test:disconnect-requested",
  ]) {
    player.removeTag(tag);
  }
  player.addTag("session:assigned");
}

function markPlaying(player) {
  player.removeTag("session:assigned");
  player.removeTag("session:starting");
  player.removeTag("session:completed");
  player.addTag("session:playing");
}

function markCompleted(player) {
  player.removeTag("session:assigned");
  player.removeTag("session:starting");
  player.removeTag("session:playing");
  player.addTag("session:completed");
}

/**
 * Development-only map adapter contract.
 *
 * Replace individual methods in MAP_ADAPTER for a real map when the
 * authored map does not use the generic arena/session tag convention.
 *
 * Methods should mutate only the supplied arena/player generation
 * scope. The harness intentionally keeps the adapter synchronous and
 * explicit so a map-specific implementation cannot hide long-running
 * background work from the experiment protocol.
 */
const BASELINE_SURFACE_PROVIDERS = {
  "arena-membership": {
    capture(context) {
      return {
        assignedPlayers:
          context.players.length,
      };
    },

    compare(snapshot, context) {
      const expected =
        Number(
          snapshot?.assignedPlayers ??
          -1
        );
      const actual =
        context.players.length;
      return {
        matches:
          expected >= 0 &&
          expected === actual,
        residueCount: 0,
        measurements: {
          expectedPlayers:
            expected,
          actualPlayers:
            actual,
        },
      };
    },
  },

  tags: {
    capture(context) {
      return Object.fromEntries(
        context.players
          .map((player) => [
            player.id,
            player
              .getTags()
              .filter((tag) =>
                tag.startsWith(
                  "session:"
                ) ||
                tag ===
                  "test:disconnect-requested"
              )
              .sort(),
          ])
          .sort(([a], [b]) =>
            a.localeCompare(b)
          )
      );
    },

    compare(snapshot, context) {
      const expected =
        snapshot &&
        typeof snapshot === "object"
          ? snapshot
          : {};
      const actual =
        Object.fromEntries(
          context.players
            .map((player) => [
              player.id,
              player
                .getTags()
                .filter((tag) =>
                  tag.startsWith(
                    "session:"
                  ) ||
                  tag ===
                    "test:disconnect-requested"
                )
                .sort(),
            ])
            .sort(([a], [b]) =>
              a.localeCompare(b)
            )
        );

      const ids =
        new Set([
          ...Object.keys(
            expected
          ),
          ...Object.keys(
            actual
          ),
        ]);
      let residueCount = 0;
      for (const id of ids) {
        if (
          JSON.stringify(
            expected[id] ?? []
          ) !==
          JSON.stringify(
            actual[id] ?? []
          )
        ) {
          residueCount += 1;
        }
      }

      return {
        matches:
          residueCount === 0,
        residueCount,
        measurements: {
          changedPlayers:
            residueCount,
        },
      };
    },
  },
};

export const MAP_ADAPTER = {
  proofAuthority:
    "server-simulated",

  baselineSurfaceProviders:
    BASELINE_SURFACE_PROVIDERS,

  supportedBaselineSurfaces:
    Object.keys(
      BASELINE_SURFACE_PROVIDERS
    ).sort(),

  findPlayer,

  playersInArena,

  resetArena(
    arenaId,
    arenaGeneration
  ) {
    const objective =
      world.scoreboard.getObjective(
        "cutscene_active"
      );
    if (objective) {
      objective.setScore(
        "#" + arenaId,
        0
      );
    }

    for (
      const player of
        playersInArena(arenaId)
    ) {
      resetSessionTags(player);
    }

    return {
      arenaId,
      arenaGeneration,
      players:
        playersInArena(arenaId).length,
    };
  },

  startArena(
    arenaId,
    arenaGeneration,
    playerCount
  ) {
    const players =
      playersInArena(arenaId)
        .slice(0, playerCount);
    for (const player of players) {
      markPlaying(player);
    }

    return {
      arenaId,
      arenaGeneration,
      players:
        players.length,
    };
  },

  finishArena(
    arenaId,
    arenaGeneration
  ) {
    const players =
      playersInArena(arenaId);
    for (const player of players) {
      markCompleted(player);
      resetSessionTags(player);
    }

    return {
      arenaId,
      arenaGeneration,
      players:
        players.length,
    };
  },

  staggeredJoin(
    arenaId,
    arenaGeneration,
    playerCount
  ) {
    const players =
      playersInArena(arenaId)
        .slice(0, playerCount);
    for (const player of players) {
      resetSessionTags(player);
    }

    return {
      arenaId,
      arenaGeneration,
      players:
        players.length,
    };
  },

  disconnectPlayer(
    playerKey,
    scope,
    phase
  ) {
    const player =
      findPlayer(playerKey);
    if (!player) {
      throw new Error(
        "Player not found: " +
          playerKey
      );
    }

    player.addTag(
      "test:disconnect-requested"
    );
    resetSessionTags(player);

    return {
      playerKey,
      scope,
      phase,
    };
  },

  captureArenaBaseline(
    arenaId,
    arenaGeneration,
    compareSurfaces
  ) {
    const players =
      playersInArena(arenaId);
    const captured =
      captureBaselineSurfaces(
        this.baselineSurfaceProviders,
        compareSurfaces,
        {
          arenaId,
          arenaGeneration,
          players,
          world,
        }
      );

    return {
      arenaId,
      arenaGeneration,
      compareSurfaces:
        captured.requestedSurfaces,
      supportedSurfaces:
        captured.supportedSurfaces,
      unsupportedSurfaces:
        captured.unsupportedSurfaces,
      surfaceSnapshots:
        captured.surfaceSnapshots,
      assignedPlayers:
        players.length,
    };
  },

  compareArenaBaseline(
    baseline
  ) {
    const players =
      playersInArena(
        baseline.arenaId
      );
    const comparison =
      compareBaselineSurfaces(
        this.baselineSurfaceProviders,
        baseline,
        {
          arenaId:
            baseline.arenaId,
          arenaGeneration:
            baseline.arenaGeneration,
          players,
          world,
        }
      );

    return {
      ...comparison,
      actualPlayers:
        players.length,
    };
  },

  executeArenaCycle(
    arenaId,
    arenaGeneration,
    playerCount
  ) {
    this.startArena(
      arenaId,
      arenaGeneration,
      playerCount
    );
    this.finishArena(
      arenaId,
      arenaGeneration
    );
  },
};

export function mapAdapterMetadata() {
  return {
    proofAuthority:
      MAP_ADAPTER.proofAuthority,
    adapter:
      "generic-arena-tag-adapter",
  };
}
