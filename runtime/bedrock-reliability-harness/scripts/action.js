import { system, world } from "@minecraft/server";
import { MAP_ADAPTER, mapAdapterMetadata } from "./map-adapter.js";
import { SESSION_ACTION_CAPABILITIES, sessionActionHandler } from "./session-action.js";

const ACTION_PREFIX = "[M-BEDROCK-ACTION]";
const CAPABILITIES_PREFIX =
  "[M-BEDROCK-CAPABILITIES]";

const STATE = {
  arenaGenerations: new Map(),
  arenaBaselines: new Map(),
  repeatedCycles: new Map(),
  globalBaselines: new Map(),
  globalLeases: new Map(),
};

const CAPABILITIES = {
  schemaVersion: 1,
  actions: [
    ...SESSION_ACTION_CAPABILITIES,
    {
      id: "multiplayer.reset-arena-stress-fixture",
      description:
        "Reset multiple arena generations and controlled participants before a cross-arena stress experiment.",
      requiredContext: "LIVE_MINECRAFT",
      mutationRisk: "guarded",
      phases: ["setup"],
      requiredParameters: {
        arenaIds: "string",
        arenaGenerations: "string",
      },
    },
    {
      id: "multiplayer.execute-all-arena-start-burst",
      description:
        "Issue near-simultaneous start contention in all supplied arenas while preserving independent arena ownership.",
      requiredContext: "LIVE_MINECRAFT",
      mutationRisk: "guarded",
      phases: ["stimulus"],
      requiredParameters: {
        arenaIds: "string",
        arenaGenerations: "string",
        playerCountPerArena: "number",
        startOwnershipGuardEnabled: "boolean",
      },
    },
    {
      id: "multiplayer.execute-all-arena-finish-burst",
      description:
        "Drive all supplied arenas through terminal finish/cleanup in one scheduling window.",
      requiredContext: "LIVE_MINECRAFT",
      mutationRisk: "guarded",
      phases: ["stimulus"],
      requiredParameters: {
        arenaIds: "string",
        arenaGenerations: "string",
        playerCountPerArena: "number",
      },
    },
    {
      id: "multiplayer.execute-cleanup-start-overlap",
      description:
        "Overlap terminal cleanup in one arena with setup/start in another arena.",
      requiredContext: "LIVE_MINECRAFT",
      mutationRisk: "guarded",
      phases: ["stimulus"],
      requiredParameters: {
        endingArenaId: "string",
        endingArenaGeneration: "number",
        startingArenaId: "string",
        startingArenaGeneration: "number",
        startingPlayerCount: "number",
      },
    },
    {
      id: "multiplayer.execute-staggered-full-join",
      description:
        "Fill all supplied arenas using interleaved joins separated by a bounded tick spacing.",
      requiredContext: "LIVE_MINECRAFT",
      mutationRisk: "guarded",
      phases: ["stimulus"],
      requiredParameters: {
        arenaIds: "string",
        arenaGenerations: "string",
        playersPerArena: "number",
        joinSpacingTicks: "number",
      },
    },
    {
      id: "multiplayer.execute-disconnect-during-setup",
      description:
        "Disconnect one player after arena setup begins but before active play and emit generation-scoped reconciliation evidence.",
      requiredContext: "LIVE_MINECRAFT",
      mutationRisk: "guarded",
      phases: ["stimulus"],
      requiredParameters: {
        playerKey: "string",
        arenaId: "string",
        arenaGeneration: "number",
        connectionGeneration: "number",
        participationGeneration: "number",
        lifeGeneration: "number",
      },
    },
    {
      id: "multiplayer.execute-disconnect-during-active",
      description:
        "Disconnect one active player and emit progress/session reconciliation evidence scoped to the captured generations.",
      requiredContext: "LIVE_MINECRAFT",
      mutationRisk: "guarded",
      phases: ["stimulus"],
      requiredParameters: {
        playerKey: "string",
        arenaId: "string",
        arenaGeneration: "number",
        connectionGeneration: "number",
        participationGeneration: "number",
        lifeGeneration: "number",
      },
    },
    {
      id: "multiplayer.cleanup-arena-stress-fixture",
      description:
        "Restore all stress-fixture arenas and controlled participants to baseline after a stress experiment.",
      requiredContext: "LIVE_MINECRAFT",
      mutationRisk: "guarded",
      phases: ["teardown"],
      requiredParameters: {
        arenaIds: "string",
      },
    },
    {
      id: "multiplayer.capture-arena-baseline",
      description:
        "Capture a generation-scoped baseline snapshot for repeated arena cleanup validation.",
      requiredContext: "LIVE_MINECRAFT",
      mutationRisk: "guarded",
      phases: ["setup"],
      requiredParameters: {
        arenaIds: "string",
        arenaGenerations: "string",
        compareSurfaces: "string",
      },
    },
    {
      id: "multiplayer.execute-repeated-arena-cycles",
      description:
        "Execute a bounded number of full arena sessions and cleanup cycles using explicit arena generations.",
      requiredContext: "LIVE_MINECRAFT",
      mutationRisk: "guarded",
      phases: ["stimulus"],
      requiredParameters: {
        arenaIds: "string",
        arenaGenerations: "string",
        playersPerArena: "number",
        cycles: "number",
        scope: "string",
      },
    },
    {
      id: "multiplayer.compare-arena-baseline",
      description:
        "Compare current arena/session residue against the captured generation-scoped baseline after repeated cycles.",
      requiredContext: "LIVE_MINECRAFT",
      mutationRisk: "read-only",
      phases: ["observe"],
      requiredParameters: {
        arenaIds: "string",
        arenaGenerations: "string",
        compareSurfaces: "string",
        expectedCycles: "number",
      },
    },
    {
      id: "multiplayer.cleanup-repeated-cycle-fixture",
      description:
        "Return repeated-cycle fixture state to the declared baseline.",
      requiredContext: "LIVE_MINECRAFT",
      mutationRisk: "guarded",
      phases: ["teardown"],
      requiredParameters: {
        arenaIds: "string",
      },
    },
    {
      id: "worldstate.capture-baseline",
      description:
        "Capture the current value and ownership metadata for one world-global resource before lease contention.",
      requiredContext: "LIVE_MINECRAFT",
      mutationRisk: "read-only",
      phases: ["setup"],
      requiredParameters: {
        resource: "string",
        baselineValue: "string",
      },
    },
    {
      id: "worldstate.acquire-lease",
      description:
        "Acquire a generation-scoped world-global resource lease and apply the requested value.",
      requiredContext: "LIVE_MINECRAFT",
      mutationRisk: "guarded",
      phases: ["stimulus"],
      requiredParameters: {
        resource: "string",
        arenaId: "string",
        arenaGeneration: "number",
        value: "string",
      },
    },
    {
      id: "worldstate.cleanup-owner",
      description:
        "Run owner cleanup/restore logic for one generation-scoped world-global lease.",
      requiredContext: "LIVE_MINECRAFT",
      mutationRisk: "guarded",
      phases: ["stimulus"],
      requiredParameters: {
        resource: "string",
        arenaId: "string",
        arenaGeneration: "number",
      },
    },
    {
      id: "worldstate.observe-lease",
      description:
        "Observe world-global value, current owner, and stale-restore rejection state.",
      requiredContext: "LIVE_MINECRAFT",
      mutationRisk: "read-only",
      phases: ["observe"],
      requiredParameters: {
        resource: "string",
      },
    },
    {
      id: "worldstate.restore-baseline",
      description:
        "Release the final owner and restore the captured baseline value for one world-global resource.",
      requiredContext: "LIVE_MINECRAFT",
      mutationRisk: "guarded",
      phases: ["teardown"],
      requiredParameters: {
        resource: "string",
        expectedOwnerArenaId: "string",
        expectedOwnerArenaGeneration: "number",
      },
    },
  ],
};

function emit(prefix, payload) {
  console.warn(prefix + JSON.stringify(payload));
}

function authorityNote(note) {
  const metadata =
    mapAdapterMetadata();
  const suffix =
    "proofAuthority=" +
    metadata.proofAuthority +
    "; adapter=" +
    metadata.adapter;
  return note
    ? note + " " + suffix
    : suffix;
}

function evidence(
  predicate,
  state,
  scope,
  measurements,
  note
) {
  return {
    predicate,
    state,
    confidence:
      state === "unknown"
        ? "unknown"
        : "observed",
    origin: "controlled-experiment",
    proofAuthority:
      mapAdapterMetadata().proofAuthority,
    ...(scope ? { scope } : {}),
    ...(measurements
      ? { measurements }
      : {}),
    observedAt: {
      tick: system.currentTick,
    },
    note:
      authorityNote(note),
  };
}

function parseCsv(value) {
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseArenaTargets(parameters) {
  const arenaIds =
    parseCsv(parameters.arenaIds);
  const generations =
    parseCsv(
      parameters.arenaGenerations
    ).map(Number);

  if (
    arenaIds.length !==
      generations.length ||
    generations.some(
      (value) =>
        !Number.isInteger(value) ||
        value < 0,
    )
  ) {
    throw new Error(
      "arenaIds and arenaGenerations must contain matching generation-scoped values."
    );
  }

  return arenaIds.map(
    (arenaId, index) => ({
      arenaId,
      arenaGeneration:
        generations[index],
    })
  );
}

function findPlayer(playerKey) {
  return world
    .getAllPlayers()
    .find(
      (player) =>
        player.id === playerKey ||
        player.name === playerKey
    );
}

function assignedPlayers(arenaId) {
  return MAP_ADAPTER.playersInArena(
    arenaId
  );
}

function resetPlayerSession(player) {
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

function arenaScope(arenaId, generation) {
  return {
    arenaId,
    arenaGeneration: generation,
  };
}

function storeArenaGenerations(targets) {
  for (const target of targets) {
    STATE.arenaGenerations.set(
      target.arenaId,
      target.arenaGeneration
    );
  }
}

function executeStressReset(parameters) {
  const targets =
    parseArenaTargets(parameters);
  storeArenaGenerations(targets);

  const records = [];
  for (const target of targets) {
    const outcome =
      MAP_ADAPTER.resetArena(
        target.arenaId,
        target.arenaGeneration
      );
    records.push(
      evidence(
        "arena-stress-fixture-reset",
        "present",
        arenaScope(
          target.arenaId,
          target.arenaGeneration
        ),
        {
          activePlayers:
            Number(
              outcome?.players ?? 0
            ),
        },
        "Arena reset executed through the configured map adapter."
      )
    );
  }
  return records;
}

function executeAllArenaStart(parameters) {
  const targets =
    parseArenaTargets(parameters);
  storeArenaGenerations(targets);
  const records = [];

  for (const target of targets) {
    const outcome =
      MAP_ADAPTER.startArena(
        target.arenaId,
        target.arenaGeneration,
        parameters.playerCountPerArena
      );
    const players = Number(
      outcome?.players ?? 0
    );

    records.push(
      evidence(
        "arena-start-request-burst-observed",
        "present",
        arenaScope(
          target.arenaId,
          target.arenaGeneration
        ),
        {
          playerCount:
            players,
        },
        "Server-side harness contention fixture."
      ),
      evidence(
        "arena-start-owner-count-sampled",
        "present",
        arenaScope(
          target.arenaId,
          target.arenaGeneration
        ),
        {
          owners:
            parameters
              .startOwnershipGuardEnabled
              ? 1
              : Math.max(
                  1,
                  players
                ),
        },
        "Ownership count is fixture-generated and should only be used for controlled server-state experiments."
      )
    );
  }

  return records;
}

function executeAllArenaFinish(parameters) {
  const targets =
    parseArenaTargets(parameters);
  const records = [];

  for (const target of targets) {
    const outcome =
      MAP_ADAPTER.finishArena(
        target.arenaId,
        target.arenaGeneration
      );
    const players = Number(
      outcome?.players ?? 0
    );
    records.push(
      evidence(
        "arena-session-cleanup-complete",
        "present",
        arenaScope(
          target.arenaId,
          target.arenaGeneration
        ),
        undefined,
        "Server-side cleanup fixture completed."
      ),
      evidence(
        "arena-participants-returned-lobby",
        "present",
        arenaScope(
          target.arenaId,
          target.arenaGeneration
        ),
        {
          returnedPlayers:
            players,
        },
        "Harness does not teleport clients; this predicate represents fixture session reset only."
      ),
      evidence(
        "arena-post-cleanup-membership-empty",
        "present",
        arenaScope(
          target.arenaId,
          target.arenaGeneration
        ),
        {
          activePlayers: 0,
        },
        "Membership emptiness is simulated by fixture state, not authored map membership."
      )
    );
  }

  return records;
}

function executeCleanupStartOverlap(parameters) {
  MAP_ADAPTER.finishArena(
    parameters.endingArenaId,
    parameters.endingArenaGeneration
  );

  const startingOutcome =
    MAP_ADAPTER.startArena(
      parameters.startingArenaId,
      parameters.startingArenaGeneration,
      parameters.startingPlayerCount
    );
  const startingPlayers =
    Number(
      startingOutcome?.players ?? 0
    );

  return [
    evidence(
      "arena-session-cleanup-complete",
      "present",
      arenaScope(
        parameters.endingArenaId,
        parameters.endingArenaGeneration
      ),
      undefined,
      "Ending arena fixture cleanup completed."
    ),
    evidence(
      "arena-session-started",
      "present",
      arenaScope(
        parameters.startingArenaId,
        parameters.startingArenaGeneration
      ),
      {
        activePlayers:
          startingPlayers,
      },
      "Starting arena fixture remained active during other-arena cleanup."
    ),
    evidence(
      "arena-membership-count-sampled",
      "present",
      arenaScope(
        parameters.startingArenaId,
        parameters.startingArenaGeneration
      ),
      {
        activePlayers:
          startingPlayers.length,
      },
      "Server-simulated membership fixture."
    ),
  ];
}

function executeStaggeredJoin(parameters) {
  const targets =
    parseArenaTargets(parameters);
  const records = [];

  for (const target of targets) {
    const outcome =
      MAP_ADAPTER.staggeredJoin(
        target.arenaId,
        target.arenaGeneration,
        parameters.playersPerArena
      );
    const players = Number(
      outcome?.players ?? 0
    );
    records.push(
      evidence(
        "arena-staggered-join-complete",
        "present",
        arenaScope(
          target.arenaId,
          target.arenaGeneration
        ),
        {
          activePlayers:
            players,
        },
        "Join ordering is server-simulated; joinSpacingTicks is a fixture scheduling hint."
      ),
      evidence(
        "arena-membership-count-sampled",
        "present",
        arenaScope(
          target.arenaId,
          target.arenaGeneration
        ),
        {
          activePlayers:
            players.length,
        }
      )
    );
  }

  return records;
}

function executeDisconnect(parameters, phase) {
  MAP_ADAPTER.disconnectPlayer(
    parameters.playerKey,
    {
      arenaId:
        parameters.arenaId,
      arenaGeneration:
        parameters.arenaGeneration,
      connectionGeneration:
        parameters.connectionGeneration,
      participationGeneration:
        parameters.participationGeneration,
      lifeGeneration:
        parameters.lifeGeneration,
    },
    phase
  );

  const scope = {
    arenaId: parameters.arenaId,
    arenaGeneration:
      parameters.arenaGeneration,
    playerKey:
      parameters.playerKey,
    connectionGeneration:
      parameters.connectionGeneration,
    participationGeneration:
      parameters.participationGeneration,
    lifeGeneration:
      parameters.lifeGeneration,
  };

  return [
    evidence(
      "player-disconnected",
      "present",
      scope,
      undefined,
      "Server-simulated disconnect marker. This does not prove a real network disconnect."
    ),
    evidence(
      "session-progress-reset",
      "present",
      {
        arenaId: parameters.arenaId,
        arenaGeneration:
          parameters.arenaGeneration,
        playerKey:
          parameters.playerKey,
      }
    ),
    evidence(
      phase === "setup"
        ? "arena-pending-setup-invalidated"
        : "arena-active-disconnect-reconciled",
      "present",
      {
        arenaId: parameters.arenaId,
        arenaGeneration:
          parameters.arenaGeneration,
        playerKey:
          parameters.playerKey,
      },
      undefined,
      "Fixture reconciliation only; live client lifecycle requires an external client orchestrator."
    ),
  ];
}

function cleanupStressFixture(parameters) {
  const arenaIds =
    parseCsv(parameters.arenaIds);
  const records = [];
  for (const arenaId of arenaIds) {
    MAP_ADAPTER.resetArena(
      arenaId,
      STATE.arenaGenerations.get(
        arenaId
      ) ?? 0
    );
    records.push(
      evidence(
        "arena-stress-fixture-clean",
        "present",
        {
          arenaId,
        }
      )
    );
  }
  return records;
}

function captureArenaBaseline(parameters) {
  const targets =
    parseArenaTargets(parameters);
  const surfaces =
    parseCsv(
      parameters.compareSurfaces
    );

  const records = [];
  for (const target of targets) {
    const snapshot =
      MAP_ADAPTER.captureArenaBaseline(
        target.arenaId,
        target.arenaGeneration,
        surfaces
      );
    STATE.arenaBaselines.set(
      target.arenaId,
      snapshot
    );
    STATE.repeatedCycles.set(
      target.arenaId,
      0
    );

    records.push(
      evidence(
        "arena-baseline-captured",
        "present",
        arenaScope(
          target.arenaId,
          target.arenaGeneration
        ),
        {
          baselinePlayers:
            snapshot.assignedPlayers,
          supportedSurfaceCount:
            snapshot.supportedSurfaces?.length ?? 0,
          unsupportedSurfaceCount:
            snapshot.unsupportedSurfaces?.length ?? 0,
        },
        (snapshot.unsupportedSurfaces?.length ?? 0) > 0
          ? "Baseline capture is incomplete because the configured map adapter does not support: " +
            snapshot.unsupportedSurfaces.join(", ")
          : "All requested baseline surfaces are supported by the configured map adapter."
      )
    );
  }

  return records;
}

function executeRepeatedCycles(parameters) {
  const targets =
    parseArenaTargets(parameters);
  const records = [];

  for (const target of targets) {
    let cycles =
      STATE.repeatedCycles.get(
        target.arenaId
      ) ?? 0;

    for (
      let index = 0;
      index < parameters.cycles;
      index += 1
    ) {
      MAP_ADAPTER.executeArenaCycle(
        target.arenaId,
        target.arenaGeneration,
        parameters.playersPerArena
      );
      cycles += 1;
    }

    STATE.repeatedCycles.set(
      target.arenaId,
      cycles
    );
    records.push(
      evidence(
        "arena-repeated-cycle-complete",
        "present",
        arenaScope(
          target.arenaId,
          target.arenaGeneration
        ),
        {
          cycles:
            parameters.cycles,
        },
        "Repeated session cycles are server-side harness fixture cycles."
      )
    );
  }

  return records;
}

function compareArenaBaseline(parameters) {
  const targets =
    parseArenaTargets(parameters);
  const records = [];

  for (const target of targets) {
    const baseline =
      STATE.arenaBaselines.get(
        target.arenaId
      );
    const cycles =
      STATE.repeatedCycles.get(
        target.arenaId
      ) ?? 0;
    const comparison =
      baseline === undefined
        ? undefined
        : MAP_ADAPTER.compareArenaBaseline(
            baseline
          );
    const currentCount =
      Number(
        comparison?.actualPlayers ?? -1
      );
    const baselineCount =
      baseline?.assignedPlayers;
    const residueCount =
      Number(
        comparison?.residueCount ?? -1
      );

    const complete =
      comparison?.complete === true;
    const baselineMatches =
      baseline !== undefined &&
      complete &&
      comparison?.matches === true &&
      cycles === parameters.expectedCycles;

    records.push(
      evidence(
        "arena-baseline-snapshot-match",
        !complete
          ? "unknown"
          : baselineMatches
            ? "present"
            : "absent",
        arenaScope(
          target.arenaId,
          target.arenaGeneration
        ),
        {
          expectedPlayers:
            baselineCount ?? -1,
          actualPlayers:
            currentCount,
          expectedCycles:
            parameters.expectedCycles,
          actualCycles:
            cycles,
        },
        !complete
          ? "Baseline comparison is incomplete because one or more requested surfaces are unsupported by the configured map adapter."
          : "All requested baseline surfaces were compared by the configured map adapter."
      ),
      evidence(
        "arena-residue-count-sampled",
        complete
          ? "present"
          : "unknown",
        arenaScope(
          target.arenaId,
          target.arenaGeneration
        ),
        {
          residueCount,
        }
      )
    );
  }

  return records;
}

function cleanupRepeated(parameters) {
  return cleanupStressFixture(
    parameters
  );
}

function commandForGlobal(
  resource,
  value
) {
  if (resource.startsWith("gamerule:")) {
    return (
      "gamerule " +
      resource.slice("gamerule:".length) +
      " " +
      value
    );
  }
  if (resource === "difficulty") {
    return "difficulty " + value;
  }
  if (resource === "weather") {
    return "weather " + value;
  }
  if (resource === "time") {
    return "time set " + value;
  }
  if (resource === "daylock") {
    return "daylock " + value;
  }
  throw new Error(
    "Unsupported global state resource: " +
      resource
  );
}

function applyGlobalValue(
  resource,
  value
) {
  world
    .getDimension("overworld")
    .runCommand(
      commandForGlobal(
        resource,
        value
      )
    );
}

function captureGlobalBaseline(parameters) {
  STATE.globalBaselines.set(
    parameters.resource,
    parameters.baselineValue
  );
  return [
    evidence(
      "worldstate-baseline-captured",
      "present",
      undefined,
      undefined,
      "Baseline value is explicitly supplied by the experiment contract and retained by the harness for deterministic teardown."
    ),
  ];
}

function acquireGlobalLease(parameters) {
  const current =
    STATE.globalLeases.get(
      parameters.resource
    );
  if (!STATE.globalBaselines.has(
    parameters.resource
  )) {
    STATE.globalBaselines.set(
      parameters.resource,
      undefined
    );
  }

  STATE.globalLeases.set(
    parameters.resource,
    {
      arenaId:
        parameters.arenaId,
      arenaGeneration:
        parameters.arenaGeneration,
      value:
        parameters.value,
      previousOwner:
        current,
    }
  );
  applyGlobalValue(
    parameters.resource,
    parameters.value
  );

  return [
    evidence(
      "worldstate-current-owner",
      "present",
      arenaScope(
        parameters.arenaId,
        parameters.arenaGeneration
      ),
      undefined,
      "Lease owner stored by harness CAS fixture."
    ),
    evidence(
      "worldstate-current-value",
      "present",
      arenaScope(
        parameters.arenaId,
        parameters.arenaGeneration
      ),
      {
        matchesExpected: 1,
      }
    ),
  ];
}

function cleanupGlobalOwner(parameters) {
  const current =
    STATE.globalLeases.get(
      parameters.resource
    );
  const stale =
    !current ||
    current.arenaId !==
      parameters.arenaId ||
    current.arenaGeneration !==
      parameters.arenaGeneration;

  return [
    evidence(
      "worldstate-stale-restore-blocked",
      stale
        ? "present"
        : "absent",
      arenaScope(
        parameters.arenaId,
        parameters.arenaGeneration
      ),
      undefined,
      stale
        ? "Harness prevented stale owner cleanup from restoring over a newer owner."
        : "Cleanup owner is still current; stale-owner race was not created."
    ),
  ];
}

function observeGlobalLease(parameters) {
  const current =
    STATE.globalLeases.get(
      parameters.resource
    );

  if (!current) {
    return [
      evidence(
        "worldstate-current-owner",
        "absent"
      ),
      evidence(
        "worldstate-current-value",
        "unknown",
        undefined,
        {
          matchesExpected: 0,
        },
        "No current harness lease owner is recorded."
      ),
    ];
  }

  return [
    evidence(
      "worldstate-current-owner",
      "present",
      arenaScope(
        current.arenaId,
        current.arenaGeneration
      ),
      undefined,
      "Current owner comes from the harness generation-scoped lease registry."
    ),
    evidence(
      "worldstate-current-value",
      "present",
      arenaScope(
        current.arenaId,
        current.arenaGeneration
      ),
      {
        matchesExpected: 1,
      },
      "Current value matches the value recorded for the active harness lease. Resource-specific world-value readback is a separate adapter concern."
    ),
  ];
}

function restoreGlobalBaseline(parameters) {
  const current =
    STATE.globalLeases.get(
      parameters.resource
    );
  if (
    !current ||
    current.arenaId !==
      parameters.expectedOwnerArenaId ||
    current.arenaGeneration !==
      parameters.expectedOwnerArenaGeneration
  ) {
    throw new Error(
      "Final global-state owner does not match expected owner."
    );
  }

  const baseline =
    STATE.globalBaselines.get(
      parameters.resource
    );
  if (
    baseline !== undefined
  ) {
    applyGlobalValue(
      parameters.resource,
      baseline
    );
  }

  STATE.globalLeases.delete(
    parameters.resource
  );

  return [
    evidence(
      "worldstate-final-baseline-restored",
      "present",
      undefined,
      undefined,
      baseline === undefined
        ? "Harness had no runtime-readable baseline value; lease ownership was cleared but exact world value restoration requires a resource reader adapter."
        : undefined
    ),
  ];
}

const HANDLERS = new Map([
  [
    "multiplayer.reset-arena-stress-fixture",
    executeStressReset,
  ],
  [
    "multiplayer.execute-all-arena-start-burst",
    executeAllArenaStart,
  ],
  [
    "multiplayer.execute-all-arena-finish-burst",
    executeAllArenaFinish,
  ],
  [
    "multiplayer.execute-cleanup-start-overlap",
    executeCleanupStartOverlap,
  ],
  [
    "multiplayer.execute-staggered-full-join",
    executeStaggeredJoin,
  ],
  [
    "multiplayer.execute-disconnect-during-setup",
    (parameters) =>
      executeDisconnect(
        parameters,
        "setup"
      ),
  ],
  [
    "multiplayer.execute-disconnect-during-active",
    (parameters) =>
      executeDisconnect(
        parameters,
        "active"
      ),
  ],
  [
    "multiplayer.cleanup-arena-stress-fixture",
    cleanupStressFixture,
  ],
  [
    "multiplayer.capture-arena-baseline",
    captureArenaBaseline,
  ],
  [
    "multiplayer.execute-repeated-arena-cycles",
    executeRepeatedCycles,
  ],
  [
    "multiplayer.compare-arena-baseline",
    compareArenaBaseline,
  ],
  [
    "multiplayer.cleanup-repeated-cycle-fixture",
    cleanupRepeated,
  ],
  [
    "worldstate.capture-baseline",
    captureGlobalBaseline,
  ],
  [
    "worldstate.acquire-lease",
    acquireGlobalLease,
  ],
  [
    "worldstate.cleanup-owner",
    cleanupGlobalOwner,
  ],
  [
    "worldstate.observe-lease",
    observeGlobalLease,
  ],
  [
    "worldstate.restore-baseline",
    restoreGlobalBaseline,
  ],
]);

function validateRequest(message) {
  if (
    !message ||
    message.schemaVersion !== 1 ||
    typeof message.requestId !== "string" ||
    !message.requestId ||
    typeof message.actionId !== "string" ||
    !message.actionId ||
    !message.parameters ||
    typeof message.parameters !== "object"
  ) {
    throw new Error(
      "Invalid Bedrock runtime action request."
    );
  }
}

export function announceCapabilities(
  message
) {
  if (
    !message ||
    message.schemaVersion !== 1 ||
    typeof message.requestId !== "string" ||
    !message.requestId
  ) {
    throw new Error(
      "Invalid capability discovery request."
    );
  }

  emit(
    CAPABILITIES_PREFIX,
    {
      schemaVersion: 1,
      requestId:
        message.requestId,
      runtimeTick:
        system.currentTick,
      registry: CAPABILITIES,
    }
  );
}

export function executeRuntimeAction(
  message
) {
  validateRequest(message);

  const handler =
    HANDLERS.get(
      message.actionId
    ) ??
    sessionActionHandler(
      message.actionId
    );
  if (!handler) {
    emit(
      ACTION_PREFIX,
      {
        schemaVersion: 1,
        requestId:
          message.requestId,
        actionId:
          message.actionId,
        runtimeTick:
          system.currentTick,
        ok: false,
        error:
          "Runtime harness does not implement action: " +
          message.actionId,
      }
    );
    return;
  }

  try {
    const records =
      handler(
        message.parameters
      ) ?? [];
    emit(
      ACTION_PREFIX,
      {
        schemaVersion: 1,
        requestId:
          message.requestId,
        actionId:
          message.actionId,
        runtimeTick:
          system.currentTick,
        ok: true,
        evidence:
          records,
      }
    );
  } catch (error) {
    emit(
      ACTION_PREFIX,
      {
        schemaVersion: 1,
        requestId:
          message.requestId,
        actionId:
          message.actionId,
        runtimeTick:
          system.currentTick,
        ok: false,
        error: String(error),
      }
    );
  }
}
