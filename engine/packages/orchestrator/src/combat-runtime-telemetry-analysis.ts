import type {
  ReviveAnomalyKind,
  TelemetryEvent,
} from "../../project-model/src/index.js";

export interface CombatRuntimeTelemetryAnalysis {
  reviveAnomalies: number;
  byKind: Readonly<Record<ReviveAnomalyKind, number>>;
  scopedLifeGenerationMissing: number;
  scopedArenaGenerationMissing: number;
  affectedPlayers: readonly string[];
}

const KINDS: readonly ReviveAnomalyKind[] = [
  "self-revive",
  "multiple-revivers",
  "stale-revive",
  "revive-after-death",
  "invalid-reviver",
];

export function analyzeCombatRuntimeTelemetry(
  events: readonly TelemetryEvent[],
): CombatRuntimeTelemetryAnalysis {
  const revive = events.filter(
    (
      event,
    ): event is Extract<
      TelemetryEvent,
      { kind: "revive-anomaly" }
    > =>
      event.kind === "revive-anomaly",
  );

  return {
    reviveAnomalies: revive.length,
    byKind: Object.fromEntries(
      KINDS.map((kind) => [
        kind,
        revive.filter(
          (event) =>
            event.anomaly === kind,
        ).length,
      ]),
    ) as Record<ReviveAnomalyKind, number>,
    scopedLifeGenerationMissing:
      revive.filter(
        (event) =>
          event.scope.lifeGeneration ===
          undefined,
      ).length,
    scopedArenaGenerationMissing:
      revive.filter(
        (event) =>
          event.scope.arenaGeneration ===
          undefined,
      ).length,
    affectedPlayers: [
      ...new Set(
        revive.map(
          (event) =>
            event.targetPlayerKey,
        ),
      ),
    ].sort(),
  };
}
