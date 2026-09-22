import fc from "fast-check";
import type { SessionAction } from "./session-model.js";

export interface SessionGeneratorConfig {
  playerIds: readonly string[];
  arenaIds: readonly string[];
  maxSequenceLength?: number;
}

export function sessionActionArbitrary(
  config: SessionGeneratorConfig,
): fc.Arbitrary<SessionAction> {
  const playerId = fc.constantFrom(...config.playerIds);
  const arenaId = fc.constantFrom(...config.arenaIds);

  return fc.oneof(
    playerId.map((id) => ({ kind: "join", playerId: id }) as const),
    fc.record({ playerId, arenaId }).map(({ playerId: id, arenaId: arena }) => ({
      kind: "assign",
      playerId: id,
      arenaId: arena,
    }) as const),
    playerId.map((id) => ({ kind: "start", playerId: id }) as const),
    playerId.map((id) => ({ kind: "begin-playing", playerId: id }) as const),
    fc.record({
      playerId,
      amount: fc.integer({ min: -2, max: 5 }),
    }).map(({ playerId: id, amount }) => ({
      kind: "progress",
      playerId: id,
      amount,
    }) as const),
    playerId.map((id) => ({ kind: "complete", playerId: id }) as const),
    playerId.map((id) => ({ kind: "disconnect", playerId: id }) as const),
    playerId.map((id) => ({ kind: "reconnect", playerId: id }) as const),
    arenaId.map((id) => ({ kind: "reset-arena", arenaId: id }) as const),
  );
}

export function sessionSequenceArbitrary(
  config: SessionGeneratorConfig,
): fc.Arbitrary<SessionAction[]> {
  return fc.array(
    sessionActionArbitrary(config),
    {
      minLength: 1,
      maxLength: config.maxSequenceLength ?? 40,
    },
  );
}
