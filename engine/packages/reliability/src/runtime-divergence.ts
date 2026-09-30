import { checkSessionInvariants, type SessionInvariantViolation } from "./session-invariants.js";
import type { MultiplayerSessionModel } from "./session-model.js";
import type { RuntimeObservationSnapshot } from "./runtime-observation.js";
import { normalizeObservationToSessionModel } from "./runtime-normalize.js";

export interface ModelDivergence {
  kind: "missing-player" | "unexpected-player" | "player-state" | "missing-arena" | "unexpected-arena" | "arena-state";
  message: string;
  playerId?: string;
  arenaId?: string;
}

export interface RuntimeComparisonResult {
  ok: boolean;
  unknowns: string[];
  invariantViolations: SessionInvariantViolation[];
  divergences: ModelDivergence[];
}

export function compareRuntimeObservation(
  expected: MultiplayerSessionModel,
  snapshot: RuntimeObservationSnapshot,
): RuntimeComparisonResult {
  const normalized = normalizeObservationToSessionModel(snapshot);
  const actual = normalized.model;
  const divergences: ModelDivergence[] = [];

  for (const [playerId, expectedPlayer] of Object.entries(expected.players)) {
    const actualPlayer = actual.players[playerId];
    if (!actualPlayer) {
      divergences.push({
        kind: "missing-player",
        playerId,
        message: `Expected player ${playerId} is missing from runtime observation.`,
      });
      continue;
    }

    if (
      actualPlayer.connected !== expectedPlayer.connected ||
      actualPlayer.arenaId !== expectedPlayer.arenaId ||
      actualPlayer.phase !== expectedPlayer.phase ||
      actualPlayer.progress !== expectedPlayer.progress
    ) {
      divergences.push({
        kind: "player-state",
        playerId,
        message: `Runtime player state diverges for ${playerId}.`,
      });
    }
  }

  for (const playerId of Object.keys(actual.players)) {
    if (!expected.players[playerId]) {
      divergences.push({
        kind: "unexpected-player",
        playerId,
        message: `Runtime observation contains unexpected player ${playerId}.`,
      });
    }
  }

  for (const [arenaId, expectedArena] of Object.entries(expected.arenas)) {
    const actualArena = actual.arenas[arenaId];
    if (!actualArena) {
      divergences.push({
        kind: "missing-arena",
        arenaId,
        message: `Expected arena ${arenaId} is missing from runtime observation.`,
      });
      continue;
    }

    const expectedMembers = [...expectedArena.activePlayerIds].sort();
    const actualMembers = [...actualArena.activePlayerIds].sort();

    if (
      JSON.stringify(expectedMembers) !== JSON.stringify(actualMembers) ||
      actualArena.cutsceneActive !== expectedArena.cutsceneActive ||
      actualArena.round !== expectedArena.round
    ) {
      divergences.push({
        kind: "arena-state",
        arenaId,
        message: `Runtime arena state diverges for ${arenaId}.`,
      });
    }
  }

  for (const arenaId of Object.keys(actual.arenas)) {
    if (!expected.arenas[arenaId]) {
      divergences.push({
        kind: "unexpected-arena",
        arenaId,
        message: `Runtime observation contains unexpected arena ${arenaId}.`,
      });
    }
  }

  const invariantViolations = checkSessionInvariants(actual);

  return {
    ok: divergences.length === 0 && invariantViolations.length === 0,
    unknowns: normalized.unknowns,
    invariantViolations,
    divergences,
  };
}
