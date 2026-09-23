export type SessionPhase =
  | "lobby"
  | "assigned"
  | "starting"
  | "playing"
  | "completed";

export interface PlayerSessionState {
  playerId: string;
  connected: boolean;
  arenaId?: string;
  phase: SessionPhase;
  progress: number;
}

export interface ArenaSessionState {
  arenaId: string;
  activePlayerIds: string[];
  cutsceneActive: boolean;
  round: number;
}

export interface MultiplayerSessionModel {
  players: Record<string, PlayerSessionState>;
  arenas: Record<string, ArenaSessionState>;
}

export type SessionAction =
  | { kind: "join"; playerId: string }
  | { kind: "assign"; playerId: string; arenaId: string }
  | { kind: "start"; playerId: string }
  | { kind: "begin-playing"; playerId: string }
  | { kind: "progress"; playerId: string; amount: number }
  | { kind: "complete"; playerId: string }
  | { kind: "disconnect"; playerId: string }
  | { kind: "reconnect"; playerId: string }
  | { kind: "reset-arena"; arenaId: string };

export function createSessionModel(
  arenaIds: readonly string[],
): MultiplayerSessionModel {
  return {
    players: {},
    arenas: Object.fromEntries(
      arenaIds.map((arenaId) => [
        arenaId,
        {
          arenaId,
          activePlayerIds: [],
          cutsceneActive: false,
          round: 0,
        } satisfies ArenaSessionState,
      ]),
    ),
  };
}

function ensurePlayer(
  model: MultiplayerSessionModel,
  playerId: string,
): PlayerSessionState {
  return model.players[playerId] ?? {
    playerId,
    connected: false,
    phase: "lobby",
    progress: 0,
  };
}

function withPlayer(
  model: MultiplayerSessionModel,
  player: PlayerSessionState,
): MultiplayerSessionModel {
  return {
    ...model,
    players: {
      ...model.players,
      [player.playerId]: player,
    },
  };
}

function removeFromAllArenas(
  model: MultiplayerSessionModel,
  playerId: string,
): MultiplayerSessionModel {
  const arenas: Record<string, ArenaSessionState> = {};
  for (const [arenaId, arena] of Object.entries(model.arenas)) {
    arenas[arenaId] = {
      ...arena,
      activePlayerIds: arena.activePlayerIds.filter((id) => id !== playerId),
    };
  }
  return { ...model, arenas };
}

export function applySessionAction(
  model: MultiplayerSessionModel,
  action: SessionAction,
): MultiplayerSessionModel {
  const current = ensurePlayer(model, "playerId" in action ? action.playerId : "");

  if (action.kind === "join") {
    return withPlayer(model, {
      ...current,
      connected: true,
      phase: current.arenaId ? "assigned" : "lobby",
      progress: 0,
    });
  }

  if (action.kind === "assign") {
    if (!model.arenas[action.arenaId]) return model;
    let next = removeFromAllArenas(model, action.playerId);
    const player = ensurePlayer(next, action.playerId);
    next = withPlayer(next, {
      ...player,
      connected: true,
      arenaId: action.arenaId,
      phase: "assigned",
      progress: 0,
    });
    const arena = next.arenas[action.arenaId]!;
    const otherStartingPlayer = arena.activePlayerIds.some((playerId) =>
      next.players[playerId]?.phase === "starting"
    );
    return {
      ...next,
      arenas: {
        ...next.arenas,
        [action.arenaId]: {
          ...arena,
          activePlayerIds: [...new Set([...arena.activePlayerIds, action.playerId])],
          cutsceneActive: otherStartingPlayer,
        },
      },
    };
  }

  if (action.kind === "start") {
    if (!current.connected || !current.arenaId || current.phase !== "assigned") return model;
    const arena = model.arenas[current.arenaId];
    if (!arena) return model;
    return {
      ...withPlayer(model, { ...current, phase: "starting" }),
      arenas: {
        ...model.arenas,
        [current.arenaId]: { ...arena, cutsceneActive: true },
      },
    };
  }

  if (action.kind === "begin-playing") {
    if (!current.connected || !current.arenaId || current.phase !== "starting") return model;
    const arena = model.arenas[current.arenaId];
    if (!arena) return model;
    return {
      ...withPlayer(model, { ...current, phase: "playing" }),
      arenas: {
        ...model.arenas,
        [current.arenaId]: { ...arena, cutsceneActive: false },
      },
    };
  }

  if (action.kind === "progress") {
    if (current.phase !== "playing" || !current.connected) return model;
    return withPlayer(model, {
      ...current,
      progress: Math.max(0, current.progress + action.amount),
    });
  }

  if (action.kind === "complete") {
    if (current.phase !== "playing") return model;
    return withPlayer(model, { ...current, phase: "completed" });
  }

  if (action.kind === "disconnect") {
    const next = withPlayer(model, {
      ...current,
      connected: false,
      phase: current.arenaId ? "assigned" : "lobby",
      progress: 0,
    });
    if (!current.arenaId) return next;
    const arena = next.arenas[current.arenaId];
    if (!arena) return next;
    return {
      ...next,
      arenas: {
        ...next.arenas,
        [current.arenaId]: { ...arena, cutsceneActive: false },
      },
    };
  }

  if (action.kind === "reconnect") {
    return withPlayer(model, {
      ...current,
      connected: true,
      phase: current.arenaId ? "assigned" : "lobby",
      progress: 0,
    });
  }

  const arena = model.arenas[action.arenaId];
  if (!arena) return model;

  let next = model;
  for (const playerId of arena.activePlayerIds) {
    const player = ensurePlayer(next, playerId);
    next = withPlayer(next, {
      ...player,
      phase: "assigned",
      progress: 0,
    });
  }

  return {
    ...next,
    arenas: {
      ...next.arenas,
      [action.arenaId]: {
        ...arena,
        cutsceneActive: false,
        round: 0,
      },
    },
  };
}
