import {
  RegressionCorpus,
  type RegressionCase,
  type ReliabilityDomain,
  type ReliabilityLane,
} from "../../../reliability/src/index.js";
import type {
  CounterexampleScenario,
} from "../../../runtime-lab/src/index.js";
import type {
  PostRepairClosureResult,
} from "./post-repair-closure.js";

export interface ClosedRepairRegressionInput {
  closure: PostRepairClosureResult;
  scenario: CounterexampleScenario;
  title: string;
  domain: ReliabilityDomain;
  discoveredBy: ReliabilityLane | "manual";
  invariantIds: readonly string[];
  triggerTags: readonly string[];
  capabilityTags: readonly string[];
  observedDefect: string;
  firstObservedVersion?: string;
  lastKnownGoodVersion?: string;
  fixturePath?: string;
}

function reproductionSteps(
  scenario: CounterexampleScenario,
): string[] {
  return [
    ...scenario.steps.map(
      (step) =>
        String(step.index) + ". " + step.instruction,
    ),
    "Assert: " + scenario.assertion.instruction,
  ];
}

export function regressionCaseFromClosedRepair(
  input: ClosedRepairRegressionInput,
): RegressionCase {
  if (input.closure.disposition !== "fixed") {
    throw new Error(
      "Only a fixed post-repair closure can be promoted into the regression corpus.",
    );
  }

  if (
    input.closure.defectRegression.scenarioId !==
      input.scenario.id
  ) {
    throw new Error(
      "Regression scenario does not match the post-repair defect receipt.",
    );
  }

  if (input.invariantIds.length === 0) {
    throw new Error(
      "Closed repair regression requires at least one invariant id.",
    );
  }

  if (!input.title.trim()) {
    throw new Error(
      "Closed repair regression title must be non-empty.",
    );
  }

  if (!input.observedDefect.trim()) {
    throw new Error(
      "Closed repair regression observed defect must be non-empty.",
    );
  }

  const id = [
    "regression",
    input.scenario.id,
    input.closure.transactionId,
  ].join(":");

  return {
    id,
    title: input.title,
    domain: input.domain,
    discoveredBy: input.discoveredBy,
    invariantIds:
      [...new Set(input.invariantIds)].sort(),
    triggerTags:
      [...new Set(input.triggerTags)].sort(),
    capabilityTags:
      [...new Set(input.capabilityTags)].sort(),
    reproduction: reproductionSteps(
      input.scenario,
    ),
    expected:
      input.scenario.assertion.instruction,
    observed: input.observedDefect,
    ...(input.fixturePath === undefined
      ? {}
      : { fixturePath: input.fixturePath }),
    ...(input.firstObservedVersion === undefined
      ? {}
      : {
          firstObservedVersion:
            input.firstObservedVersion,
        }),
    ...(input.lastKnownGoodVersion === undefined
      ? {}
      : {
          lastKnownGoodVersion:
            input.lastKnownGoodVersion,
        }),
  };
}

export function addClosedRepairToRegressionCorpus(
  corpus: RegressionCorpus,
  input: ClosedRepairRegressionInput,
): RegressionCase {
  const regression =
    regressionCaseFromClosedRepair(input);
  corpus.add(regression);
  return regression;
}
