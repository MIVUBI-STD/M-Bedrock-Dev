import { compareRuntimeObservation, type RuntimeComparisonResult } from "./runtime-divergence.js";
import {
  applySessionAction,
  createSessionModel,
  type MultiplayerSessionModel,
} from "./session-model.js";
import { orderTimedActions, type TimedSessionAction } from "./timing-scenarios.js";
import type { RuntimeObservationSnapshot } from "./runtime-observation.js";

export interface LiveRegressionScenario {
  id: string;
  title: string;
  arenaIds: readonly string[];
  actions: readonly TimedSessionAction[];
}

export interface LiveRegressionCheckpoint {
  runtimeTick: number;
  scenarioTick: number;
  snapshot: RuntimeObservationSnapshot;
  expected: MultiplayerSessionModel;
  comparison: RuntimeComparisonResult;
}

export interface LiveRegressionIncidentBundle {
  schemaVersion: 1;
  scenarioId: string;
  title: string;
  runtimeStartTick: number;
  firstDivergenceTick: number;
  scenarioTick: number;
  minecraftVersion?: string;
  artifactFingerprint?: string;
  expected: MultiplayerSessionModel;
  observed: RuntimeObservationSnapshot;
  comparison: RuntimeComparisonResult;
  nearbySnapshots: RuntimeObservationSnapshot[];
}

export interface LiveRegressionRunResult {
  ok: boolean;
  scenarioId: string;
  runtimeStartTick: number;
  checkpoints: LiveRegressionCheckpoint[];
  skippedSnapshots: RuntimeObservationSnapshot[];
  incident?: LiveRegressionIncidentBundle;
}

function expectedModelAtScenarioTick(
  scenario: LiveRegressionScenario,
  scenarioTick: number,
): MultiplayerSessionModel {
  let model = createSessionModel(scenario.arenaIds);
  for (const entry of orderTimedActions(scenario.actions)) {
    if (entry.tick > scenarioTick) break;
    model = applySessionAction(model, entry.action);
  }
  return model;
}

function nearbySnapshots(
  snapshots: readonly RuntimeObservationSnapshot[],
  index: number,
): RuntimeObservationSnapshot[] {
  return snapshots.slice(Math.max(0, index - 1), Math.min(snapshots.length, index + 2));
}

export function runLiveRegression(
  scenario: LiveRegressionScenario,
  snapshots: readonly RuntimeObservationSnapshot[],
  runtimeStartTick: number,
): LiveRegressionRunResult {
  const orderedSnapshots = [...snapshots]
    .filter((snapshot) => snapshot.tick !== undefined)
    .sort((a, b) => a.tick! - b.tick!);

  const skippedSnapshots = snapshots.filter((snapshot) => snapshot.tick === undefined);
  const checkpoints: LiveRegressionCheckpoint[] = [];
  let incident: LiveRegressionIncidentBundle | undefined;

  orderedSnapshots.forEach((snapshot, index) => {
    const runtimeTick = snapshot.tick!;
    if (runtimeTick < runtimeStartTick) {
      skippedSnapshots.push(snapshot);
      return;
    }

    const scenarioTick = runtimeTick - runtimeStartTick;
    const expected = expectedModelAtScenarioTick(scenario, scenarioTick);
    const comparison = compareRuntimeObservation(expected, snapshot);

    const checkpoint: LiveRegressionCheckpoint = {
      runtimeTick,
      scenarioTick,
      snapshot,
      expected,
      comparison,
    };
    checkpoints.push(checkpoint);

    if (!incident && !comparison.ok) {
      incident = {
        schemaVersion: 1,
        scenarioId: scenario.id,
        title: scenario.title,
        runtimeStartTick,
        firstDivergenceTick: runtimeTick,
        scenarioTick,
        ...(snapshot.minecraftVersion
          ? { minecraftVersion: snapshot.minecraftVersion }
          : {}),
        ...(snapshot.artifactFingerprint
          ? { artifactFingerprint: snapshot.artifactFingerprint }
          : {}),
        expected,
        observed: snapshot,
        comparison,
        nearbySnapshots: nearbySnapshots(orderedSnapshots, index),
      };
    }
  });

  return {
    ok: incident === undefined && checkpoints.length > 0,
    scenarioId: scenario.id,
    runtimeStartTick,
    checkpoints,
    skippedSnapshots,
    ...(incident ? { incident } : {}),
  };
}
