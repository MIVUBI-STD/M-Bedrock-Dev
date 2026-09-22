import type { MultiplayerSessionModel } from "./session-model.js";

export interface ConcurrencyOracleResult {
  ok: boolean;
  violations: string[];
}

export function checkIndependentArenaCutscenes(
  model: MultiplayerSessionModel,
  arenaIds: readonly string[],
): ConcurrencyOracleResult {
  const violations: string[] = [];

  for (const arenaId of arenaIds) {
    const arena = model.arenas[arenaId];
    if (!arena) {
      violations.push(`Missing arena ${arenaId}.`);
      continue;
    }

    const hasStartingPlayer = arena.activePlayerIds.some(
      (playerId) => model.players[playerId]?.phase === "starting",
    );

    if (hasStartingPlayer && !arena.cutsceneActive) {
      violations.push(
        `Arena ${arenaId} has a starting player but its cutscene is not active.`,
      );
    }
  }

  return {
    ok: violations.length === 0,
    violations,
  };
}
