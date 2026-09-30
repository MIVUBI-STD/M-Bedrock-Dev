import {
  augmentRetestPlan,
  type RegressionExecutionQueue,
  type ReliabilityDomain,
  type RetestPlan,
  type RetestReason,
} from "../../reliability/src/index.js";
import type {
  RegressionBatchRunResult,
} from "./regression-execution-queue-runner.js";

export interface RegressionBatchRetestFeedback {
  plan: RetestPlan;
  addedReasons: readonly RetestReason[];
  addedDomains: readonly ReliabilityDomain[];
}

function domainByRegression(
  queue: RegressionExecutionQueue,
): ReadonlyMap<string, ReliabilityDomain> {
  return new Map(
    [
      ...queue.runtimeReady,
      ...queue.manualRequired,
    ].map((item) => [
      item.regressionId,
      item.domain,
    ]),
  );
}

export function applyRegressionBatchRetestFeedback(
  plan: RetestPlan,
  queue: RegressionExecutionQueue,
  result: RegressionBatchRunResult,
): RegressionBatchRetestFeedback {
  if (
    plan.mapId !== queue.mapId ||
    plan.mapId !== result.mapId
  ) {
    throw new Error(
      "Regression batch feedback mapId mismatch.",
    );
  }
  if (
    plan.updateVersion !== queue.updateVersion ||
    plan.updateVersion !== result.updateVersion
  ) {
    throw new Error(
      "Regression batch feedback updateVersion mismatch.",
    );
  }

  const domains = domainByRegression(queue);
  const addedReasons: RetestReason[] = [];
  const addedDomains = new Set<ReliabilityDomain>();

  for (const item of result.regressed) {
    addedReasons.push({
      kind: "causal-regression",
      detail:
        "Historical regression reproduced: " +
        item.regressionId +
        ".",
      weight: 6,
    });
    const domain = domains.get(item.regressionId);
    if (domain) addedDomains.add(domain);
  }

  for (const item of result.blocked) {
    addedReasons.push({
      kind: "coverage-gap",
      detail:
        "Historical regression could not be executed automatically: " +
        item.regressionId +
        ".",
      weight: 3,
    });
    const domain = domains.get(item.regressionId);
    if (domain) addedDomains.add(domain);
  }

  for (const item of result.manualRequired) {
    addedReasons.push({
      kind: "coverage-gap",
      detail:
        "Historical regression still requires manual execution: " +
        item.regressionId +
        ".",
      weight: 1,
    });
    const domain = domains.get(item.regressionId);
    if (domain) addedDomains.add(domain);
  }

  const extraDomains = [...addedDomains].sort();
  return {
    plan: augmentRetestPlan(
      plan,
      addedReasons,
      extraDomains,
    ),
    addedReasons,
    addedDomains: extraDomains,
  };
}
