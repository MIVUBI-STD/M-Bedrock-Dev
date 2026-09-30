import { createHash } from "node:crypto";
import type { RuntimeObservationSnapshot } from "../../reliability/src/index.js";

export function runtimeSnapshotSemanticKey(
  snapshot: RuntimeObservationSnapshot,
): string {
  const players = [...snapshot.players]
    .sort((a, b) => a.playerId.localeCompare(b.playerId))
    .map((player) => ({
      id: player.playerId,
      connected: player.connected,
      arenaId: player.arenaId ?? null,
      phase: player.phase ?? null,
      progress: player.progress ?? null,
      tags: [...(player.tags ?? [])].sort(),
      scores: Object.fromEntries(
        Object.entries(player.scores ?? {}).sort(([a], [b]) => a.localeCompare(b)),
      ),
    }));

  const arenas = [...snapshot.arenas]
    .sort((a, b) => a.arenaId.localeCompare(b.arenaId))
    .map((arena) => ({
      id: arena.arenaId,
      members: [...(arena.activePlayerIds ?? [])].sort(),
      cutscene: arena.cutsceneActive ?? null,
      round: arena.round ?? null,
      tags: [...(arena.tags ?? [])].sort(),
      scores: Object.fromEntries(
        Object.entries(arena.scores ?? {}).sort(([a], [b]) => a.localeCompare(b)),
      ),
    }));

  const entities = [...(snapshot.entities ?? [])]
    .sort((a, b) => a.entityId.localeCompare(b.entityId))
    .map((entity) => ({
      id: entity.entityId,
      typeId: entity.typeId,
      arenaId: entity.arenaId ?? null,
      dimension: entity.dimension ?? null,
      tags: [...(entity.tags ?? [])].sort(),
      position: entity.position ?? null,
      alive: entity.alive ?? null,
    }));

  return createHash("sha256")
    .update(JSON.stringify({ players, arenas, entities }))
    .digest("hex");
}

export function distinctRuntimeStates(
  snapshots: readonly RuntimeObservationSnapshot[],
): number {
  return new Set(snapshots.map(runtimeSnapshotSemanticKey)).size;
}

export function runtimeVersions(
  snapshots: readonly RuntimeObservationSnapshot[],
): string[] {
  return [...new Set(
    snapshots
      .map((snapshot) => snapshot.minecraftVersion)
      .filter((value): value is string => typeof value === "string" && value.length > 0),
  )].sort();
}
