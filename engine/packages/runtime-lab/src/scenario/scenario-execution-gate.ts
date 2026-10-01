import type {
  CounterexampleScenario,
} from "./counterexample-scenario.js";
import {
  planCounterexampleScenarioRequirements,
  type ScenarioRequirementPlan,
  type ScenarioRequirementPlanInput,
} from "./scenario-requirements.js";

export type ScenarioExecutionGateStatus =
  | "executed"
  | "blocked";

export interface ScenarioExecutionGateResult<T> {
  status: ScenarioExecutionGateStatus;
  plan: ScenarioRequirementPlan;
  result?: T;
}

export interface CounterexampleScenarioExecutor<T> {
  execute(
    scenario: CounterexampleScenario,
  ): Promise<T>;
}

export async function executeCounterexampleScenarioWithGate<T>(
  input: ScenarioRequirementPlanInput,
  executor: CounterexampleScenarioExecutor<T>,
): Promise<ScenarioExecutionGateResult<T>> {
  const plan =
    planCounterexampleScenarioRequirements(input);

  if (plan.readiness !== "READY_TO_EXECUTE") {
    return {
      status: "blocked",
      plan,
    };
  }

  const result = await executor.execute(
    input.scenario,
  );

  return {
    status: "executed",
    plan,
    result,
  };
}

export function assertCounterexampleScenarioReady(
  plan: ScenarioRequirementPlan,
): void {
  if (plan.readiness === "READY_TO_EXECUTE") {
    return;
  }

  const details = [
    ...plan.reasons,
    ...plan.validationErrors,
    ...(plan.missingActionIds.length === 0
      ? []
      : [
          "Missing action ids: " +
            plan.missingActionIds.join(", "),
        ]),
  ];

  throw new Error(
    "Counterexample scenario execution blocked: " +
      plan.readiness +
      (details.length === 0
        ? ""
        : " - " + details.join("; ")),
  );
}
