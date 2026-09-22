import { createHash } from "node:crypto";
import type { MultiplayerSessionModel } from "../../reliability/src/index.js";

export function canonicalSessionState(
  model: MultiplayerSessionModel,
): string {
  const players = Object.values(model.players)
    .sort((a, b) => a.playerId.localeCompare(b.playerId))
    .map((player) => ({
      playerId: player.playerId,
      connected: player.connected,
      arenaId: player.arenaId ?? null,
      phase: player.phase,
      progress: player.progress,
    }));

  const arenas = Object.values(model.arenas)
    .sort((a, b) => a.arenaId.localeCompare(b.arenaId))
    .map((arena) => ({
      arenaId: arena.arenaId,
      activePlayerIds: [...arena.activePlayerIds].sort(),
      cutsceneActive: arena.cutsceneActive,
      round: arena.round,
    }));

  return JSON.stringify({ players, arenas });
}

export function sessionStateIdentity(
  model: MultiplayerSessionModel,
): string {
  return "state_" + createHash("sha256")
    .update(canonicalSessionState(model))
    .digest("hex")
    .slice(0, 20);
}
