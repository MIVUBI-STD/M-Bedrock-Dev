import type {
  DiagnosticExecutionContext,
} from "../../project-model/src/index.js";
import {
  runtimeActionCapabilityById,
  validateRuntimeActionInvocation,
  type RuntimeActionCapabilityRegistry,
} from "./action-capability.js";
import type {
  RuntimeExperimentDefinition,
  RuntimeExperimentProtocolStep,
} from "./types.js";

export interface RuntimeExperimentCapabilityPreflight {
  experimentId: string;
  ready: boolean;
  requiredActionIds: readonly string[];
  missingActionIds: readonly string[];
  validationErrors: readonly string[];
  reasons: readonly string[];
}

type ParameterValue = string | number | boolean;

function resolvedParameters(
  definition: RuntimeExperimentDefinition,
  step: RuntimeExperimentProtocolStep,
): Readonly<Record<string, ParameterValue>>[] {
  if (step.phase === "observe") return [];

  return definition.arms.map((arm) =>
    Object.fromEntries(
      Object.entries(step.parameters ?? {}).map(
        ([key, value]) => {
          if (
            typeof value === "string" &&
            value.startsWith("$factor.")
          ) {
            const factorId = value.slice("$factor.".length);
            const resolved = arm.factorValues[factorId];
            return [key, resolved ?? value];
          }
          return [key, value];
        },
      ),
    )
  );
}

export function preflightRuntimeExperimentCapabilities(
  definition: RuntimeExperimentDefinition,
  registry: RuntimeActionCapabilityRegistry,
  context: Extract<
    DiagnosticExecutionContext,
    "LOCAL_MINECRAFT" | "LIVE_MINECRAFT"
  >,
): RuntimeExperimentCapabilityPreflight {
  const mutatingSteps = definition.protocol.filter(
    (step) => step.phase !== "observe",
  );
  const requiredActionIds = [
    ...new Set(mutatingSteps.map((step) => step.actionId)),
  ].sort();
  const missingActionIds = requiredActionIds.filter(
    (actionId) =>
      runtimeActionCapabilityById(registry, actionId) === undefined,
  );
  const validationErrors: string[] = [];

  for (const step of mutatingSteps) {
    if (missingActionIds.includes(step.actionId)) continue;
    const parameterSets = resolvedParameters(definition, step);
    for (const parameters of parameterSets) {
      const validation = validateRuntimeActionInvocation(
        registry,
        {
          actionId: step.actionId,
          phase: step.phase,
          parameters,
          context,
          mutationRisk: definition.mutationRisk,
        },
      );
      validationErrors.push(...validation.errors);
    }
  }

  const ready =
    missingActionIds.length === 0 &&
    validationErrors.length === 0;

  return {
    experimentId: definition.id,
    ready,
    requiredActionIds,
    missingActionIds,
    validationErrors: [...new Set(validationErrors)].sort(),
    reasons: ready
      ? [
          "All mutating runtime experiment actions are supported by the announced capability registry.",
        ]
      : [
          ...(missingActionIds.length === 0
            ? []
            : [
                "Missing runtime experiment actions: " +
                  missingActionIds.join(", ") +
                  ".",
              ]),
          ...(validationErrors.length === 0
            ? []
            : [
                "One or more runtime experiment action bindings are incompatible with the announced capability contract.",
              ]),
        ],
  };
}
