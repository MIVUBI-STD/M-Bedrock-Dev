import type {
  MultiplayerSessionModel,
  PlayerSessionState,
} from "./session-model.js";

export interface SessionInvariantViolation {
  invariantId: string;
  message: string;
  playerId?: string;
  arenaId?: string;
}

export function checkSessionInvariants(
  model: MultiplayerSessionModel,
): SessionInvariantViolation[] {
  const violations: SessionInvariantViolation[] = [];

  const arenaMembership = new Map<string, string[]>();
  for (const arena of Object.values(model.arenas)) {
    for (const playerId of arena.activePlayerIds) {
      const memberships = arenaMembership.get(playerId) ?? [];
      memberships.push(arena.arenaId);
      arenaMembership.set(playerId, memberships);
    }
  }

  for (const [playerId, memberships] of arenaMembership) {
    if (memberships.length > 1) {
      violations.push({
        invariantId: "multiplayer.state-isolation",
        message: `Player ${playerId} belongs to multiple arenas: ${memberships.join(", ")}`,
        playerId,
      });
    }
  }

  for (const player of Object.values(model.players)) {
    if (player.arenaId) {
      const arena = model.arenas[player.arenaId];
      if (!arena || !arena.activePlayerIds.includes(player.playerId)) {
        violations.push({
          invariantId: "multiplayer.assignment-consistency",
          message: `Player ${player.playerId} references arena ${player.arenaId} without matching arena membership.`,
          playerId: player.playerId,
          arenaId: player.arenaId,
        });
      }
    }

    if (!player.connected && player.progress !== 0) {
      violations.push({
        invariantId: "multiplayer.disconnect-resets-progress",
        message: `Disconnected player ${player.playerId} retained progress ${player.progress}.`,
        playerId: player.playerId,
      });
    }

    if (
      player.phase === "playing" &&
      (!player.connected || !player.arenaId)
    ) {
      violations.push({
        invariantId: "multiplayer.playing-requires-active-session",
        message: `Player ${player.playerId} is playing without a connected assigned session.`,
        playerId: player.playerId,
      });
    }
  }

  for (const arena of Object.values(model.arenas)) {
    const startingPlayers = arena.activePlayerIds
      .map((id) => model.players[id])
      .filter((player): player is PlayerSessionState => player !== undefined)
      .filter((player) => player.phase === "starting");

    if (arena.cutsceneActive && startingPlayers.length === 0) {
      violations.push({
        invariantId: "multiplayer.cutscene-owned-by-arena-session",
        message: `Arena ${arena.arenaId} has an active cutscene without a starting player.`,
        arenaId: arena.arenaId,
      });
    }
  }

  return violations;
}
