import type { RuntimeControlPlan } from "./runtime-control.js";
import type { RuntimeControlAck } from "./control-ack-parser.js";
import type { RuntimeObservationSnapshot } from "./runtime-observation.js";
import type {
  LiveRegressionRunResult,
  LiveRegressionScenario,
} from "./live-regression-runner.js";
import { runLiveRegression } from "./live-regression-runner.js";

export interface ControlExecutionStatus {
  requestedTick: number;
  action: RuntimeControlPlan["actions"][number]["action"];
  status: "executed" | "failed" | "missing-ack" | "late";
  actualTick?: number;
  error?: string;
}

export interface RegressionSessionReport {
  schemaVersion: 1;
  scenarioId: string;
  runtimeStartTick: number;
  control: {
    total: number;
    executed: number;
    failed: number;
    missing: number;
    late: number;
    actions: ControlExecutionStatus[];
  };
  observations: {
    total: number;
    withoutTick: number;
  };
  live: LiveRegressionRunResult;
  verdict: "pass" | "runtime-divergence" | "control-failure" | "incomplete-evidence";
}

function sameAction(
  a: RuntimeControlPlan["actions"][number]["action"],
  b: RuntimeControlAck["action"],
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function buildRegressionSessionReport(
  scenario: LiveRegressionScenario,
  controlPlan: RuntimeControlPlan,
  acknowledgements: readonly RuntimeControlAck[],
  snapshots: readonly RuntimeObservationSnapshot[],
  runtimeStartTick: number,
): RegressionSessionReport {
  const used = new Set<number>();
  const actions: ControlExecutionStatus[] = controlPlan.actions.map((entry) => {
    const requestedRuntimeTick = runtimeStartTick + entry.tick;

    const matchIndex = acknowledgements.findIndex((ack, index) =>
      !used.has(index) &&
      ack.scenarioId === controlPlan.scenarioId &&
      ack.requestedTick === requestedRuntimeTick &&
      sameAction(entry.action, ack.action),
    );

    if (matchIndex < 0) {
      return {
        requestedTick: requestedRuntimeTick,
        action: entry.action,
        status: "missing-ack",
      };
    }

    used.add(matchIndex);
    const ack = acknowledgements[matchIndex]!;

    if (!ack.ok) {
      return {
        requestedTick: requestedRuntimeTick,
        action: entry.action,
        status: "failed",
        actualTick: ack.runtimeTick,
        ...(ack.error ? { error: ack.error } : {}),
      };
    }

    if (ack.runtimeTick > requestedRuntimeTick) {
      return {
        requestedTick: requestedRuntimeTick,
        action: entry.action,
        status: "late",
        actualTick: ack.runtimeTick,
      };
    }

    return {
      requestedTick: requestedRuntimeTick,
      action: entry.action,
      status: "executed",
      actualTick: ack.runtimeTick,
    };
  });

  const live = runLiveRegression(scenario, snapshots, runtimeStartTick);
  const failed = actions.filter((item) => item.status === "failed").length;
  const missing = actions.filter((item) => item.status === "missing-ack").length;
  const late = actions.filter((item) => item.status === "late").length;
  const executed = actions.filter((item) => item.status === "executed").length;
  const withoutTick = snapshots.filter((snapshot) => snapshot.tick === undefined).length;

  let verdict: RegressionSessionReport["verdict"];
  if (failed > 0 || late > 0) {
    verdict = "control-failure";
  } else if (missing > 0 || live.checkpoints.length === 0) {
    verdict = "incomplete-evidence";
  } else if (!live.ok) {
    verdict = "runtime-divergence";
  } else {
    verdict = "pass";
  }

  return {
    schemaVersion: 1,
    scenarioId: scenario.id,
    runtimeStartTick,
    control: {
      total: actions.length,
      executed,
      failed,
      missing,
      late,
      actions,
    },
    observations: {
      total: snapshots.length,
      withoutTick,
    },
    live,
    verdict,
  };
}

export function serializeRegressionSessionReport(
  report: RegressionSessionReport,
): string {
  return JSON.stringify(report, null, 2) + "\n";
}
