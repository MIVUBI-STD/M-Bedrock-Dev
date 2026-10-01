import type {
  DiagnosticExecutionContext,
} from "../../../project-model/src/index.js";
import {
  runtimeActionCapabilityById,
  validateRuntimeActionInvocation,
  type RuntimeActionCapabilityRegistry,
} from "../core/action-capability.js";
import type {
  CounterexampleScenario,
} from "./counterexample-scenario.js";
import type {
  RuntimeExperimentMutationRisk,
  RuntimeExperimentProtocolPhase,
} from "../core/types.js";

export type ScenarioReadiness =
  | "READY_TO_EXECUTE"
  | "CAPABILITY_GAP"
  | "RUNTIME_PROFILE_MISMATCH"
  | "REQUIRES_MANUAL_QA";

export interface ScenarioCapabilityRequirement {
  actionId: string;
  phase: RuntimeExperimentProtocolPhase;
  parameters: Readonly<
    Record<string, string | number | boolean>
  >;
  transitionIds: readonly string[];
}

export interface ScenarioRequirementPlan {
  scenarioId: string;
  readiness: ScenarioReadiness;
  requiredActions: readonly ScenarioCapabilityRequirement[];
  missingActionIds: readonly string[];
  validationErrors: readonly string[];
  reasons: readonly string[];
}

export interface ScenarioRequirementPlanInput {
  scenario: CounterexampleScenario;
  announcedCapabilities?: RuntimeActionCapabilityRegistry;
  context: Extract<
    DiagnosticExecutionContext,
    "LOCAL_MINECRAFT" | "LIVE_MINECRAFT"
  >;
  mutationRisk: Exclude<
    RuntimeExperimentMutationRisk,
    "read-only"
  >;
  runtimeProfileMatches: boolean;
}

function requirementsFromScenario(
  scenario: CounterexampleScenario,
): ScenarioCapabilityRequirement[] {
  const byAction = new Map<
    string,
    {
      phase: RuntimeExperimentProtocolPhase;
      parameters: Readonly<
        Record<string, string | number | boolean>
      >;
      transitionIds: string[];
    }
  >();

  for (const step of scenario.steps) {
    const binding = step.runtimeBinding;
    if (!binding) continue;
    const phase = binding.phase ?? "stimulus";

    const key = JSON.stringify([
      binding.actionId,
      phase,
      binding.parameters ?? {},
    ]);
    const current = byAction.get(key);
    if (current) {
      current.transitionIds.push(step.transitionId);
      continue;
    }

    byAction.set(key, {
      phase,
      parameters: binding.parameters ?? {},
      transitionIds: [step.transitionId],
    });
  }

  const assertionBinding =
    scenario.assertion.runtimeBinding;

  if (assertionBinding) {
    const key = JSON.stringify([
      assertionBinding.actionId,
      "observe",
      assertionBinding.parameters ?? {},
    ]);
    const current = byAction.get(key);
    if (!current) {
      byAction.set(key, {
        phase: "observe",
        parameters:
          assertionBinding.parameters ?? {},
        transitionIds: [],
      });
    }
  }

  return [...byAction.entries()]
    .map(([key, value]) => ({
      actionId: JSON.parse(key)[0] as string,
      phase: value.phase,
      parameters: value.parameters,
      transitionIds: [...value.transitionIds].sort(),
    }))
    .sort((a, b) =>
      a.phase.localeCompare(b.phase) ||
      a.actionId.localeCompare(b.actionId)
    );
}

export function planCounterexampleScenarioRequirements(
  input: ScenarioRequirementPlanInput,
): ScenarioRequirementPlan {
  const requiredActions = requirementsFromScenario(
    input.scenario,
  );

  if (!input.runtimeProfileMatches) {
    return {
      scenarioId: input.scenario.id,
      readiness: "RUNTIME_PROFILE_MISMATCH",
      requiredActions,
      missingActionIds: [],
      validationErrors: [],
      reasons: [
        "Target runtime profile does not match the scenario execution target.",
      ],
    };
  }

  if (input.scenario.runtimeStatus === "runtime-unbound") {
    return {
      scenarioId: input.scenario.id,
      readiness: "REQUIRES_MANUAL_QA",
      requiredActions,
      missingActionIds: [],
      validationErrors: [],
      reasons: [
        "Scenario is missing one or more explicit runtime bindings.",
      ],
    };
  }

  if (!input.announcedCapabilities) {
    return {
      scenarioId: input.scenario.id,
      readiness: "CAPABILITY_GAP",
      requiredActions,
      missingActionIds:
        requiredActions.map((item) => item.actionId),
      validationErrors: [],
      reasons: [
        "Runtime action capabilities have not been announced.",
      ],
    };
  }

  const missing = new Set<string>();
  const validationErrors: string[] = [];

  for (const requirement of requiredActions) {
    if (
      !runtimeActionCapabilityById(
        input.announcedCapabilities,
        requirement.actionId,
      )
    ) {
      missing.add(requirement.actionId);
      continue;
    }

    const validation = validateRuntimeActionInvocation(
      input.announcedCapabilities,
      {
        actionId: requirement.actionId,
        phase: requirement.phase,
        parameters: requirement.parameters,
        context: input.context,
        mutationRisk:
          requirement.phase === "observe"
            ? "read-only"
            : input.mutationRisk,
      },
    );
    validationErrors.push(...validation.errors);
  }

  if (missing.size > 0 || validationErrors.length > 0) {
    const missingActionIds = [...missing].sort();
    return {
      scenarioId: input.scenario.id,
      readiness: "CAPABILITY_GAP",
      requiredActions,
      missingActionIds,
      validationErrors,
      reasons: [
        ...(missingActionIds.length === 0
          ? []
          : [
              "Missing runtime actions: " +
                missingActionIds.join(", "),
            ]),
        ...(validationErrors.length === 0
          ? []
          : [
              "One or more runtime action bindings are incompatible with the announced capability contract.",
            ]),
      ],
    };
  }

  return {
    scenarioId: input.scenario.id,
    readiness: "READY_TO_EXECUTE",
    requiredActions,
    missingActionIds: [],
    validationErrors: [],
    reasons: [
      "All bound runtime actions, including observation assertions, are supported by the announced runtime capability registry.",
    ],
  };
}
