import {
  applyBehaviorTransition,
  evaluateBehaviorPredicate,
  type BehavioralWorldModel,
  type BehaviorScalar,
  type BehaviorState,
} from "../../../behavior-model/src/index.js";
import type {
  SolverQuery,
  SolverTraceStep,
} from "../../../logic-solver/src/index.js";
import type {
  RuntimeExperimentProtocolPhase,
  RuntimeExperimentProtocolStep,
} from "../core/types.js";

export type CounterexampleScenarioRuntimeStatus =
  | "runtime-unbound"
  | "runtime-bound";

export interface CounterexampleTransitionBinding {
  transitionId: string;
  actionId: string;
  phase?: RuntimeExperimentProtocolPhase;
  parameters?: Readonly<
    Record<string, string | number | boolean>
  >;
  instruction?: string;
}

export interface CounterexampleAssertionBinding {
  actionId: string;
  parameters?: Readonly<
    Record<string, string | number | boolean>
  >;
  instruction?: string;
}

export interface CounterexampleScenarioStep {
  index: number;
  transitionId: string;
  transitionOwner: string;
  instruction: string;
  runtimeBinding?: CounterexampleTransitionBinding;
}

export interface CounterexampleScenarioAssertion {
  queryId: string;
  instruction: string;
  runtimeBinding?: CounterexampleAssertionBinding;
}

export interface CounterexampleScenario {
  schemaVersion: 1;
  id: string;
  modelId: string;
  queryId: string;
  runtimeStatus: CounterexampleScenarioRuntimeStatus;
  steps: readonly CounterexampleScenarioStep[];
  assertion: CounterexampleScenarioAssertion;
  runtimeProtocol?: readonly RuntimeExperimentProtocolStep[];
  replayTrace: readonly SolverTraceStep[];
}

export interface CounterexampleScenarioCompileInput {
  id: string;
  model: BehavioralWorldModel;
  initialState: BehaviorState;
  query: SolverQuery;
  transitionIds: readonly string[];
  transitionBindings?: readonly CounterexampleTransitionBinding[];
  assertionBinding?: CounterexampleAssertionBinding;
}

function scalarText(value: BehaviorScalar | undefined): string {
  if (value === undefined) return "<missing>";
  if (typeof value === "string") return JSON.stringify(value);
  return String(value);
}

function predicateText(query: SolverQuery): string {
  if (query.kind !== "invariant") {
    return "Verify query " + query.id + ".";
  }
  return "Verify invariant " + query.id +
    " is violated at the final reproduced state.";
}

function bindingMap(
  bindings: readonly CounterexampleTransitionBinding[] | undefined,
): Map<string, CounterexampleTransitionBinding> {
  const output = new Map<string, CounterexampleTransitionBinding>();
  for (const binding of bindings ?? []) {
    if (output.has(binding.transitionId)) {
      throw new Error(
        "Duplicate runtime binding for transition: " +
          binding.transitionId +
          ".",
      );
    }
    output.set(binding.transitionId, binding);
  }
  return output;
}

function replay(
  input: CounterexampleScenarioCompileInput,
): readonly SolverTraceStep[] {
  let state = input.initialState;
  const trace: SolverTraceStep[] = [{
    depth: 0,
    state,
  }];

  for (
    let index = 0;
    index < input.transitionIds.length;
    index += 1
  ) {
    const transitionId = input.transitionIds[index]!;
    const transition = input.model.transitions.find(
      (candidate) => candidate.id === transitionId,
    );
    if (!transition) {
      throw new Error(
        "Counterexample scenario references unknown transition: " +
          transitionId +
          ".",
      );
    }

    const application = applyBehaviorTransition(
      state,
      transition,
      state.tick + 1,
    );
    if (!application.enabled) {
      throw new Error(
        "Counterexample scenario transition is not enabled during replay: " +
          transitionId +
          ".",
      );
    }

    state = application.state;
    trace.push({
      depth: index + 1,
      state,
      viaTransitionId: transitionId,
    });
  }

  if (
    input.query.kind === "invariant" &&
    evaluateBehaviorPredicate(
      state,
      input.query.predicate,
    )
  ) {
    throw new Error(
      "Counterexample scenario does not reproduce the invariant violation.",
    );
  }

  return trace;
}

function defaultInstruction(
  transitionId: string,
  owner: string,
  description: string | undefined,
): string {
  const detail = description?.trim();
  return detail
    ? detail
    : "Execute transition " + transitionId +
      " (owner: " + owner + ").";
}

function runtimeProtocol(
  steps: readonly CounterexampleScenarioStep[],
  assertion: CounterexampleScenarioAssertion,
): readonly RuntimeExperimentProtocolStep[] | undefined {
  if (
    steps.some((step) => step.runtimeBinding === undefined) ||
    assertion.runtimeBinding === undefined
  ) {
    return undefined;
  }

  const protocol: RuntimeExperimentProtocolStep[] = steps.map(
    (step) => {
      const binding = step.runtimeBinding!;
      return {
        id: "repro-" + String(step.index).padStart(2, "0"),
        phase: binding.phase ?? "stimulus",
        actionId: binding.actionId,
        ...(binding.parameters === undefined
          ? {}
          : { parameters: binding.parameters }),
      };
    },
  );

  protocol.push({
    id: "assert-counterexample",
    phase: "observe",
    actionId: assertion.runtimeBinding.actionId,
    ...(assertion.runtimeBinding.parameters === undefined
      ? {}
      : {
          parameters:
            assertion.runtimeBinding.parameters,
        }),
  });

  return protocol;
}

export function compileCounterexampleScenario(
  input: CounterexampleScenarioCompileInput,
): CounterexampleScenario {
  if (!input.id.trim()) {
    throw new Error(
      "Counterexample scenario id must be non-empty.",
    );
  }
  if (input.transitionIds.length === 0) {
    throw new Error(
      "Counterexample scenario requires at least one transition.",
    );
  }

  const trace = replay(input);
  const bindings = bindingMap(input.transitionBindings);

  const steps = input.transitionIds.map(
    (transitionId, index): CounterexampleScenarioStep => {
      const transition = input.model.transitions.find(
        (candidate) => candidate.id === transitionId,
      )!;
      const binding = bindings.get(transitionId);
      return {
        index: index + 1,
        transitionId,
        transitionOwner: transition.owner,
        instruction:
          binding?.instruction?.trim() ||
          defaultInstruction(
            transitionId,
            transition.owner,
            transition.description,
          ),
        ...(binding === undefined
          ? {}
          : { runtimeBinding: binding }),
      };
    },
  );

  const assertion: CounterexampleScenarioAssertion = {
    queryId: input.query.id,
    instruction:
      input.assertionBinding?.instruction?.trim() ||
      predicateText(input.query),
    ...(input.assertionBinding === undefined
      ? {}
      : { runtimeBinding: input.assertionBinding }),
  };

  const protocol = runtimeProtocol(steps, assertion);

  return {
    schemaVersion: 1,
    id: input.id,
    modelId: input.model.id,
    queryId: input.query.id,
    runtimeStatus:
      protocol === undefined
        ? "runtime-unbound"
        : "runtime-bound",
    steps,
    assertion,
    ...(protocol === undefined
      ? {}
      : { runtimeProtocol: protocol }),
    replayTrace: trace,
  };
}

export function counterexampleScenarioText(
  scenario: CounterexampleScenario,
): string {
  const lines = [
    "Reproduction: " + scenario.id,
    ...scenario.steps.map(
      (step) =>
        String(step.index) + ". " + step.instruction,
    ),
    "Assert: " + scenario.assertion.instruction,
  ];
  return lines.join("\n");
}

export function counterexampleScenarioFinalState(
  scenario: CounterexampleScenario,
): Readonly<Record<string, string>> {
  const state = scenario.replayTrace.at(-1)?.state;
  if (!state) return {};
  return Object.fromEntries(
    Object.keys(state.values)
      .sort()
      .map((key) => [
        key,
        scalarText(state.values[key]),
      ]),
  );
}
