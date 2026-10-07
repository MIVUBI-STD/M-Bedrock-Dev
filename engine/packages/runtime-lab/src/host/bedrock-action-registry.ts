import type {
  RuntimeActionCapability,
  RuntimeActionCapabilityRegistry,
} from "../core/action-capability.js";
import {
  CHUNK_READINESS_ACTION_CAPABILITIES,
} from "../domains/chunk/chunk-readiness-experiment.js";
import {
  CHUNK_LIFECYCLE_ACTION_CAPABILITIES,
} from "../domains/chunk/chunk-lifecycle-experiments.js";
import {
  ENTITY_NAVIGATION_ACTION_CAPABILITIES,
} from "../domains/entity/entity-navigation-experiment.js";
import {
  GLOBAL_STATE_LEASE_ACTION_CAPABILITIES,
} from "../domains/arena/global-state-lease-experiment.js";
import {
  MULTIPLAYER_CONCURRENCY_ACTION_CAPABILITIES,
} from "../domains/multiplayer/multiplayer-concurrency-experiment.js";
import {
  MULTIPLAYER_SESSION_ACTION_CAPABILITIES,
} from "../domains/multiplayer/multiplayer-session-experiment.js";
import {
  MULTIPLAYER_STRESS_ACTION_CAPABILITIES,
} from "../domains/multiplayer/multiplayer-stress-experiment.js";
import {
  PERSISTENCE_RECOVERY_ACTION_CAPABILITIES,
} from "../domains/persistence/persistence-recovery-experiment.js";
import {
  REPEATED_ARENA_CYCLE_ACTION_CAPABILITIES,
} from "../domains/arena/repeated-arena-cycle-experiment.js";
import {
  SCHEDULER_GENERATION_ACTION_CAPABILITIES,
} from "../domains/scheduler/scheduler-generation-experiment.js";
import {
  SCHEDULER_ISOLATION_ACTION_CAPABILITIES,
} from "../domains/scheduler/scheduler-isolation-experiment.js";
import {
  SCHEDULER_ORDERING_ACTION_CAPABILITIES,
} from "../domains/scheduler/scheduler-ordering-experiment.js";
import type {
  RuntimeExperimentDefinition,
} from "../core/types.js";
import {
  validateRuntimeActionCapabilityRegistry,
} from "../core/action-capability.js";

function canonical(
  value: unknown,
): string {
  if (Array.isArray(value)) {
    return "[" +
      value.map(canonical).join(",") +
      "]";
  }
  if (
    value !== null &&
    typeof value === "object"
  ) {
    const record =
      value as Record<string, unknown>;
    return "{" +
      Object.keys(record)
        .sort()
        .map(
          (key) =>
            JSON.stringify(key) +
            ":" +
            canonical(record[key]),
        )
        .join(",") +
      "}";
  }
  return JSON.stringify(value);
}

function mergeCapabilities(
  groups:
    readonly (
      readonly RuntimeActionCapability[]
    )[],
): RuntimeActionCapability[] {
  const byId = new Map<
    string,
    RuntimeActionCapability
  >();

  for (const capability of groups.flat()) {
    const existing =
      byId.get(capability.id);
    if (!existing) {
      byId.set(
        capability.id,
        capability,
      );
      continue;
    }

    if (
      canonical(existing) !==
      canonical(capability)
    ) {
      throw new Error(
        "Conflicting runtime action capability definitions share id: " +
          capability.id +
          ".",
      );
    }
  }

  return [...byId.values()].sort(
    (a, b) =>
      a.id.localeCompare(b.id),
  );
}

export const BEDROCK_RUNTIME_ACTION_CAPABILITIES:
  readonly RuntimeActionCapability[] =
    mergeCapabilities([
      CHUNK_READINESS_ACTION_CAPABILITIES,
      CHUNK_LIFECYCLE_ACTION_CAPABILITIES,
      ENTITY_NAVIGATION_ACTION_CAPABILITIES,
      GLOBAL_STATE_LEASE_ACTION_CAPABILITIES,
      MULTIPLAYER_CONCURRENCY_ACTION_CAPABILITIES,
      MULTIPLAYER_SESSION_ACTION_CAPABILITIES,
      MULTIPLAYER_STRESS_ACTION_CAPABILITIES,
      PERSISTENCE_RECOVERY_ACTION_CAPABILITIES,
      REPEATED_ARENA_CYCLE_ACTION_CAPABILITIES,
      SCHEDULER_GENERATION_ACTION_CAPABILITIES,
      SCHEDULER_ISOLATION_ACTION_CAPABILITIES,
      SCHEDULER_ORDERING_ACTION_CAPABILITIES,
    ]);

export const BEDROCK_RUNTIME_ACTION_CAPABILITY_REGISTRY:
  RuntimeActionCapabilityRegistry = {
    schemaVersion: 1,
    actions:
      BEDROCK_RUNTIME_ACTION_CAPABILITIES,
  };

const registryErrors =
  validateRuntimeActionCapabilityRegistry(
    BEDROCK_RUNTIME_ACTION_CAPABILITY_REGISTRY,
  );

if (registryErrors.length > 0) {
  throw new Error(
    "Invalid canonical Bedrock runtime action registry: " +
      registryErrors.join("; "),
  );
}

export function requiredBedrockActionCapabilities(
  definition:
    RuntimeExperimentDefinition,
): RuntimeActionCapabilityRegistry {
  const ids = new Set(
    definition.protocol
      .filter(
        (step) =>
          !step.actionId.startsWith(
            "probe."
          ),
      )
      .map((step) => step.actionId),
  );

  const actions =
    BEDROCK_RUNTIME_ACTION_CAPABILITIES
      .filter((action) =>
        ids.has(action.id)
      );

  const found =
    new Set(
      actions.map(
        (action) => action.id,
      ),
    );
  const missing =
    [...ids]
      .filter(
        (id) => !found.has(id),
      )
      .sort();

  if (missing.length > 0) {
    throw new Error(
      "Runtime experiment references action(s) absent from canonical Bedrock registry: " +
        missing.join(", ") +
        ".",
    );
  }

  return {
    schemaVersion: 1,
    actions,
  };
}

export function compareRequiredRuntimeActions(
  required:
    RuntimeActionCapabilityRegistry,
  announced:
    RuntimeActionCapabilityRegistry,
): string[] {
  const errors = [
    ...validateRuntimeActionCapabilityRegistry(
      required,
    ),
    ...validateRuntimeActionCapabilityRegistry(
      announced,
    ),
  ];
  const announcedById =
    new Map(
      announced.actions.map(
        (action) => [
          action.id,
          action,
        ],
      ),
    );

  for (const expected of required.actions) {
    const actual =
      announcedById.get(expected.id);
    if (!actual) {
      errors.push(
        "Runtime host is missing required action capability: " +
          expected.id +
          ".",
      );
      continue;
    }
    if (
      canonical(expected) !==
      canonical(actual)
    ) {
      errors.push(
        "Runtime host capability signature differs for required action: " +
          expected.id +
          ".",
      );
    }
  }

  return [...new Set(errors)].sort();
}
