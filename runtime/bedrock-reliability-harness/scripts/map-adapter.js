import { world } from "@minecraft/server";

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
export const MAP_ADAPTER = {
  proofAuthority:
    "server-simulated",

  supportedBaselineSurfaces: [
    "arena-membership",
    "tags",
  ],

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
    const supported =
      new Set(
        this.supportedBaselineSurfaces
      );
    const requested = [
      ...new Set(compareSurfaces),
    ].sort();

    return {
      arenaId,
      arenaGeneration,
      compareSurfaces:
        requested,
      supportedSurfaces:
        requested.filter(
          (surface) =>
            supported.has(surface)
        ),
      unsupportedSurfaces:
        requested.filter(
          (surface) =>
            !supported.has(surface)
        ),
      assignedPlayers:
        playersInArena(arenaId)
          .length,
    };
  },

  compareArenaBaseline(
    baseline
  ) {
    const players =
      playersInArena(
        baseline.arenaId
      );
    let residueCount = 0;

    for (const player of players) {
      const tags =
        player.getTags();
      if (
        tags.includes(
          "session:playing"
        ) ||
        tags.includes(
          "session:starting"
        ) ||
        tags.includes(
          "session:completed"
        ) ||
        tags.includes(
          "test:disconnect-requested"
        )
      ) {
        residueCount += 1;
      }
    }

    const unsupportedSurfaces =
      baseline.unsupportedSurfaces ?? [];

    return {
      matches:
        unsupportedSurfaces.length === 0 &&
        players.length ===
          baseline.assignedPlayers &&
        residueCount === 0,
      complete:
        unsupportedSurfaces.length === 0,
      unsupportedSurfaces,
      actualPlayers:
        players.length,
      residueCount,
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
