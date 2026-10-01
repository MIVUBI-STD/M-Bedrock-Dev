import type { RuntimeObservationSnapshot } from "./runtime-observation.js";

export function validateRuntimeObservation(
  snapshot: RuntimeObservationSnapshot,
): string[] {
  const errors: string[] = [];
  if (snapshot.schemaVersion !== 1) errors.push("Runtime observation schemaVersion must be 1.");

  const playerIds = new Set<string>();
  for (const player of snapshot.players) {
    if (!player.playerId.trim()) errors.push("Player observation requires playerId.");
    if (playerIds.has(player.playerId)) errors.push(`Duplicate player observation: ${player.playerId}`);
    playerIds.add(player.playerId);
  }

  const arenaIds = new Set<string>();
  for (const arena of snapshot.arenas) {
    if (!arena.arenaId.trim()) errors.push("Arena observation requires arenaId.");
    if (arenaIds.has(arena.arenaId)) errors.push(`Duplicate arena observation: ${arena.arenaId}`);
    arenaIds.add(arena.arenaId);
  }

  return errors;
}
