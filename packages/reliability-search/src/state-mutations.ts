import type {
  MultiplayerSessionModel,
  SessionAction,
} from "../../reliability/src/index.js";
import type { MutationDescriptor } from "./mutation-types.js";

export interface StateMutation {
  descriptor: MutationDescriptor;
  apply(
    before: MultiplayerSessionModel,
    action: SessionAction,
    after: MultiplayerSessionModel,
  ): MultiplayerSessionModel;
}

function cloneModel(model: MultiplayerSessionModel): MultiplayerSessionModel {
  return {
    players: Object.fromEntries(
      Object.entries(model.players).map(([id, player]) => [id, { ...player }]),
    ),
    arenas: Object.fromEntries(
      Object.entries(model.arenas).map(([id, arena]) => [
        id,
        { ...arena, activePlayerIds: [...arena.activePlayerIds] },
      ]),
    ),
  };
}

export const SESSION_STATE_MUTATIONS: readonly StateMutation[] = [
  {
    descriptor: {
      id: "state-reset-preserve-progress",
      operator: "reset-preserve-progress",
      domain: "state-reset",
      description: "Arena reset incorrectly preserves player progress.",
    },
    apply(before, action, after) {
      if (action.kind !== "reset-arena") return after;
      const next = cloneModel(after);
      for (const playerId of before.arenas[action.arenaId]?.activePlayerIds ?? []) {
        const previous = before.players[playerId];
        const current = next.players[playerId];
        if (previous && current) current.progress = previous.progress;
      }
      return next;
    },
  },
  {
    descriptor: {
      id: "state-disconnect-preserve-progress",
      operator: "disconnect-preserve-progress",
      domain: "state-reset",
      description: "Disconnect incorrectly preserves active progress.",
    },
    apply(before, action, after) {
      if (action.kind !== "disconnect") return after;
      const previous = before.players[action.playerId];
      const next = cloneModel(after);
      const current = next.players[action.playerId];
      if (previous && current) current.progress = previous.progress;
      return next;
    },
  },
  {
    descriptor: {
      id: "state-start-skips-starting",
      operator: "phase-skip",
      domain: "state-phase",
      description: "Session start skips the starting phase and enters playing immediately.",
    },
    apply(_before, action, after) {
      if (action.kind !== "start") return after;
      const next = cloneModel(after);
      const player = next.players[action.playerId];
      if (!player || player.phase !== "starting") return after;
      player.phase = "playing";
      if (player.arenaId && next.arenas[player.arenaId]) {
        next.arenas[player.arenaId]!.cutsceneActive = false;
      }
      return next;
    },
  },
  {
    descriptor: {
      id: "state-cutscene-global-lock",
      operator: "shared-cutscene-lock",
      domain: "state-concurrency",
      description: "Starting one arena disables cutscene state in other arenas.",
    },
    apply(_before, action, after) {
      if (action.kind !== "start") return after;
      const player = after.players[action.playerId];
      if (!player?.arenaId || player.phase !== "starting") return after;
      const next = cloneModel(after);
      for (const arena of Object.values(next.arenas)) {
        if (arena.arenaId !== player.arenaId) arena.cutsceneActive = false;
      }
      return next;
    },
  },
];
