import type {
  MultiplayerSessionModel,
  PlayerSessionState,
  ArenaSessionState,
} from "./session-model.js";
import type { RuntimeObservationSnapshot } from "./runtime-observation.js";

export interface ObservationNormalizationResult {
  model: MultiplayerSessionModel;
  unknowns: string[];
}

export function normalizeObservationToSessionModel(
  snapshot: RuntimeObservationSnapshot,
): ObservationNormalizationResult {
  const unknowns: string[] = [];

  const players: Record<string, PlayerSessionState> = {};
  for (const player of snapshot.players) {
    const phase = player.phase ?? (player.arenaId ? "assigned" : "lobby");
    if (!player.phase) {
      unknowns.push(`player:${player.playerId}:phase-inferred`);
    }
    if (player.progress === undefined) {
      unknowns.push(`player:${player.playerId}:progress-unknown`);
    }

    players[player.playerId] = {
      playerId: player.playerId,
      connected: player.connected,
      ...(player.arenaId ? { arenaId: player.arenaId } : {}),
      phase,
      progress: player.progress ?? 0,
    };
  }

  const arenas: Record<string, ArenaSessionState> = {};
  for (const arena of snapshot.arenas) {
    if (!arena.activePlayerIds) unknowns.push(`arena:${arena.arenaId}:membership-unknown`);
    if (arena.cutsceneActive === undefined) unknowns.push(`arena:${arena.arenaId}:cutscene-unknown`);
    if (arena.round === undefined) unknowns.push(`arena:${arena.arenaId}:round-unknown`);

    arenas[arena.arenaId] = {
      arenaId: arena.arenaId,
      activePlayerIds: [...(arena.activePlayerIds ?? [])],
      cutsceneActive: arena.cutsceneActive ?? false,
      round: arena.round ?? 0,
    };
  }

  return {
    model: { players, arenas },
    unknowns,
  };
}
