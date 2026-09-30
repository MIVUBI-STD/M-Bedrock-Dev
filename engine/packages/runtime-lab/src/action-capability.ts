import type {
  DiagnosticExecutionContext,
} from "../../project-model/src/index.js";
import type {
  RuntimeExperimentMutationRisk,
  RuntimeExperimentProtocolPhase,
} from "./types.js";

export type RuntimeActionParameterType =
  | "string"
  | "number"
  | "boolean";

export interface RuntimeActionCapability {
  id: string;
  description?: string;
  requiredContext: Extract<
    DiagnosticExecutionContext,
    "LOCAL_MINECRAFT" | "LIVE_MINECRAFT"
  >;
  mutationRisk: RuntimeExperimentMutationRisk;
  phases: readonly RuntimeExperimentProtocolPhase[];
  requiredParameters?: Readonly<
    Record<string, RuntimeActionParameterType>
  >;
  optionalParameters?: Readonly<
    Record<string, RuntimeActionParameterType>
  >;
}

export interface RuntimeActionCapabilityRegistry {
  schemaVersion: 1;
  actions: readonly RuntimeActionCapability[];
}

export interface RuntimeActionValidation {
  ok: boolean;
  errors: readonly string[];
}

const CONTEXT_RANK: Readonly<
  Record<
    Extract<
      DiagnosticExecutionContext,
      "LOCAL_MINECRAFT" | "LIVE_MINECRAFT"
    >,
    number
  >
> = {
  LOCAL_MINECRAFT: 0,
  LIVE_MINECRAFT: 1,
};

const RISK_RANK: Readonly<
  Record<RuntimeExperimentMutationRisk, number>
> = {
  "read-only": 0,
  guarded: 1,
  mutating: 2,
};

export function validateRuntimeActionCapabilityRegistry(
  registry: RuntimeActionCapabilityRegistry,
): string[] {
  const errors: string[] = [];
  if (registry.schemaVersion !== 1) {
    errors.push(
      "Runtime action capability registry schemaVersion must be 1.",
    );
  }

  const ids = new Set<string>();
  for (const action of registry.actions) {
    if (!action.id.trim()) {
      errors.push(
        "Runtime action capability id must be non-empty.",
      );
    }
    if (ids.has(action.id)) {
      errors.push(
        "Duplicate runtime action capability id: " +
          action.id +
          ".",
      );
    }
    ids.add(action.id);

    if (action.phases.length === 0) {
      errors.push(
        "Runtime action capability " +
          action.id +
          " requires at least one supported phase.",
      );
    }
    if (new Set(action.phases).size !== action.phases.length) {
      errors.push(
        "Runtime action capability " +
          action.id +
          " contains duplicate phases.",
      );
    }

    if (
      action.phases.includes("observe") &&
      action.mutationRisk !== "read-only"
    ) {
      errors.push(
        "Runtime observe capability " +
          action.id +
          " must declare read-only mutation risk.",
      );
    }

    const required = new Set(
      Object.keys(action.requiredParameters ?? {}),
    );
    for (const key of Object.keys(
      action.optionalParameters ?? {},
    )) {
      if (required.has(key)) {
        errors.push(
          "Runtime action capability " +
            action.id +
            " declares parameter as both required and optional: " +
            key +
            ".",
        );
      }
    }
  }

  return errors;
}

export function runtimeActionCapabilityById(
  registry: RuntimeActionCapabilityRegistry,
  actionId: string,
): RuntimeActionCapability | undefined {
  return registry.actions.find(
    (action) => action.id === actionId,
  );
}

function matchesParameterType(
  value: string | number | boolean,
  type: RuntimeActionParameterType,
): boolean {
  return typeof value === type;
}

export function validateRuntimeActionInvocation(
  registry: RuntimeActionCapabilityRegistry,
  input: {
    actionId: string;
    phase: RuntimeExperimentProtocolPhase;
    parameters: Readonly<
      Record<string, string | number | boolean>
    >;
    context: Extract<
      DiagnosticExecutionContext,
      "LOCAL_MINECRAFT" | "LIVE_MINECRAFT"
    >;
    mutationRisk: RuntimeExperimentMutationRisk;
  },
): RuntimeActionValidation {
  const errors = validateRuntimeActionCapabilityRegistry(
    registry,
  );
  const action = runtimeActionCapabilityById(
    registry,
    input.actionId,
  );

  if (!action) {
    return {
      ok: false,
      errors: [
        ...errors,
        "Runtime action capability is not registered: " +
          input.actionId +
          ".",
      ],
    };
  }

  if (!action.phases.includes(input.phase)) {
    errors.push(
      "Runtime action " +
        action.id +
        " does not support phase " +
        input.phase +
        ".",
    );
  }

  if (
    CONTEXT_RANK[input.context] <
      CONTEXT_RANK[action.requiredContext]
  ) {
    errors.push(
      "Runtime action " +
        action.id +
        " requires " +
        action.requiredContext +
        " but host provides " +
        input.context +
        ".",
    );
  }

  if (
    RISK_RANK[input.mutationRisk] <
      RISK_RANK[action.mutationRisk]
  ) {
    errors.push(
      "Runtime action " +
        action.id +
        " requires mutation risk " +
        action.mutationRisk +
        " but experiment declares " +
        input.mutationRisk +
        ".",
    );
  }

  const required = action.requiredParameters ?? {};
  const optional = action.optionalParameters ?? {};
  const allowed = new Set([
    ...Object.keys(required),
    ...Object.keys(optional),
  ]);

  for (const [key, type] of Object.entries(required)) {
    const value = input.parameters[key];
    if (value === undefined) {
      errors.push(
        "Runtime action " +
          action.id +
          " requires parameter " +
          key +
          ".",
      );
      continue;
    }
    if (!matchesParameterType(value, type)) {
      errors.push(
        "Runtime action " +
          action.id +
          " parameter " +
          key +
          " must be " +
          type +
          ".",
      );
    }
  }

  for (const [key, value] of Object.entries(
    input.parameters,
  )) {
    if (!allowed.has(key)) {
      errors.push(
        "Runtime action " +
          action.id +
          " received undeclared parameter " +
          key +
          ".",
      );
      continue;
    }
    const type = required[key] ?? optional[key];
    if (
      type !== undefined &&
      !matchesParameterType(value, type)
    ) {
      errors.push(
        "Runtime action " +
          action.id +
          " parameter " +
          key +
          " must be " +
          type +
          ".",
      );
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}
