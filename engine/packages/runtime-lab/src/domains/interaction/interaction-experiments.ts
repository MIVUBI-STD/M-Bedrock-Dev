import type { RuntimeActionCapability } from "../../core/action-capability.js";
import type { RuntimeExperimentDefinition } from "../../core/types.js";

export interface InteractionExperimentInput {
  id: string;
  title: string;
  targetProfileFingerprint: string;
  fixtureFingerprint: string;
  playerKey: string;
  objectiveId: string;
  participant: string;
  minimumRunsPerArm?: number;
}

export const INTERACTION_ACTION_CAPABILITIES:
  readonly RuntimeActionCapability[] = [{
    id: "interaction.reset-fixture",
    description:
      "Reset controlled use/interact/cooldown/form/input-permission state for one player.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["setup"],
    requiredParameters: { playerKey: "string" },
  }, {
    id: "interaction.run-use-sequence",
    description:
      "Run a controlled start/use/stop/release sequence with optional before-event cancellation and dimension transition.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      playerKey: "string",
      cancelBeforeUse: "boolean",
      dimensionChangeDuringUse: "boolean",
      holdTicks: "number",
    },
  }, {
    id: "interaction.run-cooldown-sequence",
    description:
      "Apply and query a controlled item cooldown category across two fixture items.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      playerKey: "string",
      sharedCategory: "boolean",
    },
  }, {
    id: "interaction.run-entity-interaction",
    description:
      "Run a controlled entity interaction and emit before/after held-item evidence.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: { playerKey: "string" },
  }, {
    id: "interaction.run-form-context",
    description:
      "Attempt a controlled form show in normal or restricted execution context.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      playerKey: "string",
      restrictedContext: "boolean",
    },
  }, {
    id: "interaction.run-input-permission-change",
    description:
      "Apply a controlled input-permission change and emit observability evidence.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      playerKey: "string",
      enabled: "boolean",
    },
  }, {
    id: "interaction.cleanup-fixture",
    description: "Restore controlled interaction fixture state.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["teardown"],
    requiredParameters: { playerKey: "string" },
  }];

function probe(input: InteractionExperimentInput, predicate: string) {
  return {
    id: "probe-" + predicate,
    phase: "observe" as const,
    actionId: "probe.scoreboard-value",
    parameters: {
      objectiveId: input.objectiveId,
      participant: input.participant,
      expected: 1,
      predicate,
    },
  };
}

function common(
  input: InteractionExperimentInput,
  stimulus: RuntimeExperimentDefinition["protocol"][number],
  predicates: readonly string[],
  factors: RuntimeExperimentDefinition["factors"],
  arms: RuntimeExperimentDefinition["arms"],
): RuntimeExperimentDefinition {
  return {
    schemaVersion: 1,
    id: input.id,
    title: input.title,
    domain: "state",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    targetProfileFingerprint: input.targetProfileFingerprint,
    fixtureFingerprint: input.fixtureFingerprint,
    protocol: [{
      id: "reset",
      phase: "setup",
      actionId: "interaction.reset-fixture",
      parameters: { playerKey: input.playerKey },
    }, stimulus, ...predicates.map((predicate) => probe(input, predicate)), {
      id: "cleanup",
      phase: "teardown",
      actionId: "interaction.cleanup-fixture",
      parameters: { playerKey: input.playerKey },
    }],
    factors,
    arms,
    outcomePredicateIds: predicates,
    minimumRunsPerArm: input.minimumRunsPerArm ?? 2,
  };
}

export function createUseLifecycleExperiment(
  input: InteractionExperimentInput,
): RuntimeExperimentDefinition {
  return common(input, {
    id: "use-sequence",
    phase: "stimulus",
    actionId: "interaction.run-use-sequence",
    parameters: {
      playerKey: input.playerKey,
      cancelBeforeUse: "$factor.cancel-before-use",
      dimensionChangeDuringUse: "$factor.dimension-change",
      holdTicks: 20,
    },
  }, [
    "before-use-observed",
    "use-action-observed",
    "release-duration-observed",
    "stop-use-observed",
  ], [
    { id: "cancel-before-use", description: "Whether the before-use event is cancelled." },
    { id: "dimension-change", description: "Whether dimension changes during the use lifecycle." },
  ], [{
    id: "control",
    role: "control",
    factorValues: { "cancel-before-use": false, "dimension-change": false },
  }, {
    id: "treatment",
    role: "treatment",
    factorValues: { "cancel-before-use": true, "dimension-change": true },
  }]);
}

export function createCooldownExperiment(
  input: InteractionExperimentInput,
): RuntimeExperimentDefinition {
  return common(input, {
    id: "cooldown-sequence",
    phase: "stimulus",
    actionId: "interaction.run-cooldown-sequence",
    parameters: {
      playerKey: input.playerKey,
      sharedCategory: "$factor.shared-category",
    },
  }, ["cooldown-runtime-observed", "cooldown-category-sharing-observed"], [{
    id: "shared-category",
    description: "Whether the fixture items share a cooldown category.",
  }], [{
    id: "control", role: "control", factorValues: { "shared-category": false },
  }, {
    id: "treatment", role: "treatment", factorValues: { "shared-category": true },
  }]);
}

export function createInteractionContextExperiment(
  input: InteractionExperimentInput,
): RuntimeExperimentDefinition {
  return common(input, {
    id: "form-context",
    phase: "stimulus",
    actionId: "interaction.run-form-context",
    parameters: {
      playerKey: input.playerKey,
      restrictedContext: "$factor.restricted-context",
    },
  }, ["form-show-context-observed"], [{
    id: "restricted-context",
    description: "Whether form.show executes inside a restricted callback.",
  }], [{
    id: "control", role: "control", factorValues: { "restricted-context": false },
  }, {
    id: "treatment", role: "treatment", factorValues: { "restricted-context": true },
  }]);
}

export function createEntityInteractionAndPermissionExperiment(
  input: InteractionExperimentInput,
): RuntimeExperimentDefinition {
  return {
    schemaVersion: 1,
    id: input.id,
    title: input.title,
    domain: "state",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    targetProfileFingerprint: input.targetProfileFingerprint,
    fixtureFingerprint: input.fixtureFingerprint,
    protocol: [{
      id: "reset",
      phase: "setup",
      actionId: "interaction.reset-fixture",
      parameters: { playerKey: input.playerKey },
    }, {
      id: "entity-interaction",
      phase: "stimulus",
      actionId: "interaction.run-entity-interaction",
      parameters: { playerKey: input.playerKey },
    }, {
      id: "permission-change",
      phase: "stimulus",
      actionId: "interaction.run-input-permission-change",
      parameters: { playerKey: input.playerKey, enabled: false },
    }, probe(input, "entity-interaction-before-after-item-observed"),
       probe(input, "input-permission-change-observed"), {
      id: "cleanup",
      phase: "teardown",
      actionId: "interaction.cleanup-fixture",
      parameters: { playerKey: input.playerKey },
    }],
    factors: [],
    arms: [{ id: "control", role: "control", factorValues: {} }],
    outcomePredicateIds: [
      "entity-interaction-before-after-item-observed",
      "input-permission-change-observed",
    ],
    minimumRunsPerArm: input.minimumRunsPerArm ?? 2,
  };
}
