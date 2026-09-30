/**
 * Example map-specific adapter override.
 *
 * Copy this file to a project-specific harness variant and wire its
 * exported MAP_ADAPTER into action.js. Keep generation/arena scoping
 * explicit. Do not use broad @a/@e style mutations unless the map
 * contract itself proves that broad scope is intended.
 */
export const MAP_ADAPTER = {
  proofAuthority:
    "live-runtime",

  resetArena(
    arenaId,
    arenaGeneration
  ) {
    // Call the real authored map reset entrypoint here.
    // Return measured fixture metadata, not an assumed success.
    throw new Error(
      "Implement map-specific resetArena."
    );
  },

  startArena(
    arenaId,
    arenaGeneration,
    playerCount
  ) {
    throw new Error(
      "Implement map-specific startArena."
    );
  },

  finishArena(
    arenaId,
    arenaGeneration
  ) {
    throw new Error(
      "Implement map-specific finishArena."
    );
  },

  staggeredJoin(
    arenaId,
    arenaGeneration,
    playerCount
  ) {
    throw new Error(
      "Implement map-specific staggeredJoin."
    );
  },

  disconnectPlayer(
    playerKey,
    scope,
    phase
  ) {
    // A real-client adapter should live outside the server behavior
    // pack. A server-only implementation must not claim network proof.
    throw new Error(
      "Use an external multi-client adapter for real disconnect proof."
    );
  },

  captureArenaBaseline(
    arenaId,
    arenaGeneration,
    compareSurfaces
  ) {
    throw new Error(
      "Implement map-specific baseline capture."
    );
  },

  compareArenaBaseline(
    baseline
  ) {
    throw new Error(
      "Implement map-specific baseline comparison."
    );
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
