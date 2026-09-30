import { system } from "@minecraft/server";
import {
  MAP_ADAPTER,
  mapAdapterMetadata,
} from "./map-adapter.js";

export const SESSION_ACTION_CAPABILITIES = [{
  id: "multiplayer.reset-session-fixture",
  description:
    "Reset controlled player session, join-pad, pending transition, progress, and teleport fixture state.",
  requiredContext: "LIVE_MINECRAFT",
  mutationRisk: "guarded",
  phases: ["setup"],
  requiredParameters: {
    playerKey: "string",
    arenaId: "string",
    arenaGeneration: "number",
    connectionGeneration: "number",
    participationGeneration: "number",
    lifeGeneration: "number",
  },
}, {
  id: "multiplayer.enter-join-pad",
  description:
    "Enter the controlled arena join pad and create a pending join transition owned by the current player/session generations.",
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
    ownershipGuardEnabled: "boolean",
    deferredTicks: "number",
  },
}, {
  id: "multiplayer.leave-join-pad",
  description:
    "Leave the controlled join pad before a deferred join transition becomes eligible.",
  requiredContext: "LIVE_MINECRAFT",
  mutationRisk: "guarded",
  phases: ["stimulus"],
  requiredParameters: {
    playerKey: "string",
    arenaId: "string",
    participationGeneration: "number",
  },
}, {
  id: "multiplayer.disconnect-player",
  description:
    "Disconnect the controlled player and invalidate the active connection session.",
  requiredContext: "LIVE_MINECRAFT",
  mutationRisk: "guarded",
  phases: ["stimulus"],
  requiredParameters: {
    playerKey: "string",
    connectionGeneration: "number",
  },
}, {
  id: "multiplayer.reconnect-player",
  description:
    "Reconnect the logical player under a new connectionGeneration and reset transient session state.",
  requiredContext: "LIVE_MINECRAFT",
  mutationRisk: "guarded",
  phases: ["stimulus"],
  requiredParameters: {
    playerKey: "string",
    previousConnectionGeneration: "number",
    connectionGeneration: "number",
    arenaId: "string",
    arenaGeneration: "number",
    participationGeneration: "number",
    lifeGeneration: "number",
  },
}, {
  id: "multiplayer.kill-player",
  description:
    "Trigger controlled player death while a pending arena transition exists.",
  requiredContext: "LIVE_MINECRAFT",
  mutationRisk: "guarded",
  phases: ["stimulus"],
  requiredParameters: {
    playerKey: "string",
    lifeGeneration: "number",
  },
}, {
  id: "multiplayer.respawn-player",
  description:
    "Respawn the controlled logical player under the next lifeGeneration while preserving only the declared durable arena/session state.",
  requiredContext: "LIVE_MINECRAFT",
  mutationRisk: "guarded",
  phases: ["stimulus"],
  requiredParameters: {
    playerKey: "string",
    previousLifeGeneration: "number",
    lifeGeneration: "number",
    connectionGeneration: "number",
    arenaId: "string",
    arenaGeneration: "number",
    participationGeneration: "number",
  },
}, {
  id: "multiplayer.advance-runtime-ticks",
  description:
    "Advance the controlled multiplayer fixture until deferred session work becomes eligible.",
  requiredContext: "LIVE_MINECRAFT",
  mutationRisk: "guarded",
  phases: ["stimulus"],
  requiredParameters: {
    ticks: "number",
  },
}, {
  id: "multiplayer.cleanup-session-fixture",
  description:
    "Clear pending fixture-owned transitions and restore the controlled player to the fixture baseline.",
  requiredContext: "LIVE_MINECRAFT",
  mutationRisk: "guarded",
  phases: ["teardown"],
  requiredParameters: {
    playerKey: "string",
    arenaId: "string",
  },
}];

const STATE = {
  subjects: new Map(),
  pending: new Map(),
};

function note(message) {
  const meta =
    mapAdapterMetadata();
  return (
    message +
    " proofAuthority=" +
    meta.proofAuthority +
    "; adapter=" +
    meta.adapter
  );
}

function evidence(
  predicate,
  state,
  scope,
  measurements,
  message
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
      mapAdapterMetadata()
        .proofAuthority,
    scope,
    ...(measurements
      ? { measurements }
      : {}),
    observedAt: {
      tick: system.currentTick,
    },
    note: note(message),
  };
}

function subjectScope(
  subject,
  overrides = {}
) {
  return {
    playerKey:
      subject.playerKey,
    arenaId:
      subject.arenaId,
    arenaGeneration:
      subject.arenaGeneration,
    connectionGeneration:
      subject.connectionGeneration,
    participationGeneration:
      subject.participationGeneration,
    lifeGeneration:
      subject.lifeGeneration,
    ...overrides,
  };
}

function requireSubject(playerKey) {
  const subject =
    STATE.subjects.get(playerKey);
  if (!subject) {
    throw new Error(
      "Session fixture subject is not initialized: " +
        playerKey
    );
  }
  return subject;
}

function reset(parameters) {
  const subject = {
    playerKey:
      parameters.playerKey,
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
    memberCurrent: true,
    connected: true,
    alive: true,
    progress: 0,
    invalidation:
      undefined,
  };
  STATE.subjects.set(
    parameters.playerKey,
    subject
  );
  STATE.pending.delete(
    parameters.playerKey
  );

  MAP_ADAPTER.resetArena(
    parameters.arenaId,
    parameters.arenaGeneration
  );

  return [
    evidence(
      "session-fixture-reset",
      "present",
      subjectScope(subject),
      { progress: 0 },
      "Server-side session fixture reset."
    ),
  ];
}

function enterJoin(parameters) {
  const subject =
    requireSubject(
      parameters.playerKey
    );
  Object.assign(subject, {
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
    memberCurrent: true,
    invalidation:
      undefined,
  });

  STATE.pending.set(
    parameters.playerKey,
    {
      subjectSnapshot: {
        ...subject,
      },
      guardEnabled:
        parameters.ownershipGuardEnabled,
      dueTick:
        system.currentTick +
        parameters.deferredTicks,
      outcomePredicate:
        undefined,
    }
  );

  return [
    evidence(
      "join-transition-requested",
      "present",
      subjectScope(
        subject,
        {
          operationId:
            "join-request",
        }
      ),
      undefined,
      "Deferred join transition created by server fixture."
    ),
  ];
}

function leaveJoin(parameters) {
  const subject =
    requireSubject(
      parameters.playerKey
    );
  subject.memberCurrent = false;
  subject.participationGeneration =
    parameters.participationGeneration;
  subject.invalidation =
    "membership";

  const pending =
    STATE.pending.get(
      parameters.playerKey
    );
  if (pending) {
    pending.outcomePredicate =
      "stale-join-transition-observed";
  }

  return [
    evidence(
      "join-pad-left",
      "present",
      subjectScope(
        subject,
        {
          operationId:
            "join-pad-leave",
        }
      ),
      undefined,
      "Join-pad leave simulated in server fixture."
    ),
    evidence(
      "arena-membership-current",
      "absent",
      subjectScope(
        subject,
        {
          operationId:
            "post-leave",
        }
      ),
      undefined,
      "Fixture membership revoked after leave."
    ),
  ];
}

function disconnect(parameters) {
  const subject =
    requireSubject(
      parameters.playerKey
    );
  subject.connected = false;
  subject.invalidation =
    "connection";

  const pending =
    STATE.pending.get(
      parameters.playerKey
    );
  if (pending) {
    pending.outcomePredicate =
      "stale-session-mutation-observed";
  }

  MAP_ADAPTER.disconnectPlayer(
    parameters.playerKey,
    subjectScope(subject),
    "session"
  );

  return [
    evidence(
      "player-disconnected",
      "present",
      subjectScope(
        subject,
        {
          connectionGeneration:
            parameters.connectionGeneration,
          operationId:
            "disconnect",
        }
      ),
      undefined,
      "Server-simulated disconnect. This does not establish real client/network disconnect proof."
    ),
  ];
}

function reconnect(parameters) {
  const subject =
    requireSubject(
      parameters.playerKey
    );

  subject.connected = true;
  subject.connectionGeneration =
    parameters.connectionGeneration;
  subject.arenaId =
    parameters.arenaId;
  subject.arenaGeneration =
    parameters.arenaGeneration;
  subject.participationGeneration =
    parameters.participationGeneration;
  subject.lifeGeneration =
    parameters.lifeGeneration;
  subject.progress = 0;

  return [
    evidence(
      "player-reconnected",
      "present",
      subjectScope(
        subject,
        {
          operationId:
            "reconnect",
        }
      ),
      undefined,
      "Server-simulated reconnect. Real network reconnect requires an external live-client adapter."
    ),
    evidence(
      "session-progress-reset",
      "present",
      subjectScope(
        subject,
        {
          operationId:
            "reconnect-reconcile",
        }
      ),
      { progress: 0 },
      "Transient session progress reset by fixture."
    ),
  ];
}

function kill(parameters) {
  const subject =
    requireSubject(
      parameters.playerKey
    );
  subject.alive = false;
  subject.invalidation = "life";

  const pending =
    STATE.pending.get(
      parameters.playerKey
    );
  if (pending) {
    pending.outcomePredicate =
      "stale-life-join-mutation-observed";
  }

  return [
    evidence(
      "player-death-observed",
      "present",
      subjectScope(
        subject,
        {
          lifeGeneration:
            parameters.lifeGeneration,
          operationId: "death",
        }
      ),
      undefined,
      "Server fixture death transition."
    ),
  ];
}

function respawn(parameters) {
  const subject =
    requireSubject(
      parameters.playerKey
    );
  subject.alive = true;
  subject.lifeGeneration =
    parameters.lifeGeneration;
  subject.connectionGeneration =
    parameters.connectionGeneration;
  subject.arenaId =
    parameters.arenaId;
  subject.arenaGeneration =
    parameters.arenaGeneration;
  subject.participationGeneration =
    parameters.participationGeneration;
  subject.progress = 0;

  return [
    evidence(
      "player-respawn-observed",
      "present",
      subjectScope(
        subject,
        {
          operationId:
            "respawn",
        }
      ),
      undefined,
      "Server fixture respawn transition."
    ),
    evidence(
      "pending-join-invalidated",
      "present",
      subjectScope(
        subject,
        {
          operationId:
            "respawn-reconcile",
        }
      ),
      undefined,
      "Old-life pending join invalidated by fixture generation transition."
    ),
  ];
}

function advance(parameters) {
  const records = [];
  for (
    const [playerKey, pending] of
      [...STATE.pending.entries()]
  ) {
    const subject =
      requireSubject(playerKey);
    const eligibleTick =
      pending.dueTick;
    const requestedTick =
      system.currentTick +
      parameters.ticks;

    if (
      requestedTick <
      eligibleTick
    ) {
      continue;
    }

    const invalidated =
      subject.invalidation !==
        undefined ||
      !subject.memberCurrent ||
      !subject.connected ||
      !subject.alive ||
      subject.connectionGeneration !==
        pending.subjectSnapshot
          .connectionGeneration ||
      subject.lifeGeneration !==
        pending.subjectSnapshot
          .lifeGeneration ||
      subject.participationGeneration !==
        pending.subjectSnapshot
          .participationGeneration;

    const staleMutation =
      invalidated &&
      !pending.guardEnabled;

    records.push(
      evidence(
        pending.outcomePredicate ??
          "stale-session-mutation-observed",
        staleMutation
          ? "present"
          : "absent",
        subjectScope(subject),
        undefined,
        staleMutation
          ? "Disabled ownership guard allowed stale deferred fixture work."
          : "Ownership/generation guard prevented stale deferred fixture work."
      )
    );

    STATE.pending.delete(playerKey);
  }

  if (records.length === 0) {
    records.push(
      evidence(
        "runtime-ticks-advanced",
        "present",
        undefined,
        {
          ticks:
            parameters.ticks,
        },
        "No pending session transition became eligible."
      )
    );
  }

  return records;
}

function cleanup(parameters) {
  STATE.pending.delete(
    parameters.playerKey
  );
  STATE.subjects.delete(
    parameters.playerKey
  );

  MAP_ADAPTER.resetArena(
    parameters.arenaId,
    0
  );

  return [
    evidence(
      "session-fixture-clean",
      "present",
      {
        playerKey:
          parameters.playerKey,
        arenaId:
          parameters.arenaId,
      },
      undefined,
      "Session fixture state cleared."
    ),
  ];
}

const HANDLERS = new Map([
  [
    "multiplayer.reset-session-fixture",
    reset,
  ],
  [
    "multiplayer.enter-join-pad",
    enterJoin,
  ],
  [
    "multiplayer.leave-join-pad",
    leaveJoin,
  ],
  [
    "multiplayer.disconnect-player",
    disconnect,
  ],
  [
    "multiplayer.reconnect-player",
    reconnect,
  ],
  [
    "multiplayer.kill-player",
    kill,
  ],
  [
    "multiplayer.respawn-player",
    respawn,
  ],
  [
    "multiplayer.advance-runtime-ticks",
    advance,
  ],
  [
    "multiplayer.cleanup-session-fixture",
    cleanup,
  ],
]);

export function sessionActionHandler(
  actionId
) {
  return HANDLERS.get(actionId);
}
