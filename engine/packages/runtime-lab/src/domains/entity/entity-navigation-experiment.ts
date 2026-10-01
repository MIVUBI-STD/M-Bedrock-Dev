import {
  runtimeScopeContains,
  type RuntimeEvidenceRecord,
  type RuntimeScope,
} from "../../../../project-model/src/index.js";
import type {
  RuntimeActionCapability,
  RuntimeActionCapabilityRegistry,
} from "../../core/action-capability.js";
import type {
  RuntimeExperimentDefinition,
} from "../../core/types.js";

export interface EntityNavigationSubject {
  arenaId: string;
  arenaGeneration: number;
  entityKey: string;
  entityGeneration: number;
  targetKey: string;
}

export interface EntityNavigationExperimentInput {
  id: string;
  title: string;
  targetProfileFingerprint: string;
  fixtureFingerprint: string;
  objectiveId: string;
  participant: string;
  subject: EntityNavigationSubject;
  observationTicks?: number;
  stallDisplacementThreshold?: number;
  minimumRunsPerArm?: number;
}

export interface EntityNavigationRecoveryExperimentInput
  extends EntityNavigationExperimentInput {
  pathAnchorId: string;
}

export interface EntityNavigationCrowdingExperimentInput
  extends EntityNavigationExperimentInput {
  controlNearbyEntityCount?: number;
  treatmentNearbyEntityCount?: number;
}

export const ENTITY_NAVIGATION_ACTION_CAPABILITIES:
  readonly RuntimeActionCapability[] = [{
    id: "ai.reset-navigation-fixture",
    description:
      "Reset controlled navigation subject state, progress counters, crowd fixtures, and recovery markers.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["setup"],
    requiredParameters: {
      arenaId: "string",
      arenaGeneration: "number",
      entityKey: "string",
      entityGeneration: "number",
    },
  }, {
    id: "ai.bind-navigation-subject",
    description:
      "Bind a controlled entity and intended target for navigation observation without inferring target validity.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["setup"],
    requiredParameters: {
      arenaId: "string",
      arenaGeneration: "number",
      entityKey: "string",
      entityGeneration: "number",
      targetKey: "string",
    },
  }, {
    id: "ai.configure-nearby-entity-count",
    description:
      "Configure controlled nearby entity density around the focal navigation subject.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      arenaId: "string",
      entityKey: "string",
      nearbyEntityCount: "number",
    },
  }, {
    id: "ai.observe-navigation-window",
    description:
      "Observe target validity, goal activity, chunk readiness, movement progress, velocity, crowd count, and stall state over a bounded runtime window.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      arenaId: "string",
      arenaGeneration: "number",
      entityKey: "string",
      entityGeneration: "number",
      targetKey: "string",
      operationId: "string",
      windowTicks: "number",
      stallDisplacementThreshold: "number",
    },
  }, {
    id: "ai.apply-path-anchor-recovery",
    description:
      "When enabled, relocate the focal entity to a declared valid path anchor using the fixture recovery policy and emit exact recovery evidence.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      arenaId: "string",
      arenaGeneration: "number",
      entityKey: "string",
      entityGeneration: "number",
      pathAnchorId: "string",
      enabled: "boolean",
    },
  }, {
    id: "ai.cleanup-navigation-fixture",
    description:
      "Remove controlled crowd fixtures and pending recovery state without deleting the authored gameplay route.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["teardown"],
    requiredParameters: {
      arenaId: "string",
      entityKey: "string",
    },
  }];

export const ENTITY_NAVIGATION_CAPABILITY_REGISTRY:
  RuntimeActionCapabilityRegistry = {
    schemaVersion: 1,
    actions: ENTITY_NAVIGATION_ACTION_CAPABILITIES,
  };

function scope(
  subject: EntityNavigationSubject,
): RuntimeScope {
  return {
    arenaId: subject.arenaId,
    arenaGeneration: subject.arenaGeneration,
    entityKey: subject.entityKey,
    entityGeneration: subject.entityGeneration,
  };
}

function commonSetup(
  input: EntityNavigationExperimentInput,
) {
  return [{
    id: "reset-navigation-fixture",
    phase: "setup" as const,
    actionId: "ai.reset-navigation-fixture",
    parameters: {
      arenaId: input.subject.arenaId,
      arenaGeneration: input.subject.arenaGeneration,
      entityKey: input.subject.entityKey,
      entityGeneration: input.subject.entityGeneration,
    },
  }, {
    id: "bind-navigation-subject",
    phase: "setup" as const,
    actionId: "ai.bind-navigation-subject",
    parameters: {
      arenaId: input.subject.arenaId,
      arenaGeneration: input.subject.arenaGeneration,
      entityKey: input.subject.entityKey,
      entityGeneration: input.subject.entityGeneration,
      targetKey: input.subject.targetKey,
    },
  }];
}

function observeStep(
  input: EntityNavigationExperimentInput,
  id: string,
  operationId: string,
) {
  return {
    id,
    phase: "stimulus" as const,
    actionId: "ai.observe-navigation-window",
    parameters: {
      arenaId: input.subject.arenaId,
      arenaGeneration: input.subject.arenaGeneration,
      entityKey: input.subject.entityKey,
      entityGeneration: input.subject.entityGeneration,
      targetKey: input.subject.targetKey,
      operationId,
      windowTicks: input.observationTicks ?? 20,
      stallDisplacementThreshold:
        input.stallDisplacementThreshold ?? 0.25,
    },
  };
}

function completionProbe(
  input: EntityNavigationExperimentInput,
) {
  return {
    id: "probe-navigation-trial-complete",
    phase: "observe" as const,
    actionId: "probe.scoreboard-value",
    parameters: {
      objectiveId: input.objectiveId,
      participant: input.participant,
      expected: 1,
      predicate: "navigation-trial-complete",
    },
  };
}

function cleanupStep(
  input: EntityNavigationExperimentInput,
) {
  return {
    id: "cleanup-navigation-fixture",
    phase: "teardown" as const,
    actionId: "ai.cleanup-navigation-fixture",
    parameters: {
      arenaId: input.subject.arenaId,
      entityKey: input.subject.entityKey,
    },
  };
}

function baselineRequirements(
  input: EntityNavigationExperimentInput,
  operationId: string,
  idPrefix: string,
) {
  const subjectScope = {
    ...scope(input.subject),
    operationId,
  };
  return [{
    id: idPrefix + "-target-valid",
    predicateId: "navigation-target-valid",
    state: "present" as const,
    scope: subjectScope,
  }, {
    id: idPrefix + "-goal-active",
    predicateId: "navigation-goal-active",
    state: "present" as const,
    scope: subjectScope,
  }, {
    id: idPrefix + "-chunk-ready",
    predicateId: "navigation-chunk-ready",
    state: "present" as const,
    scope: subjectScope,
  }, {
    id: idPrefix + "-progress-sampled",
    predicateId: "navigation-progress-sampled",
    state: "present" as const,
    scope: subjectScope,
  }];
}

export function createNavigationRecoveryExperiment(
  input: EntityNavigationRecoveryExperimentInput,
): RuntimeExperimentDefinition {
  return {
    schemaVersion: 1,
    id: input.id,
    title: input.title,
    domain: "entity-ai",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    targetProfileFingerprint:
      input.targetProfileFingerprint,
    fixtureFingerprint:
      input.fixtureFingerprint,
    protocol: [
      ...commonSetup(input),
      observeStep(
        input,
        "observe-pre-recovery",
        "pre-recovery",
      ),
      {
        id: "apply-path-anchor-recovery",
        phase: "stimulus",
        actionId: "ai.apply-path-anchor-recovery",
        parameters: {
          arenaId: input.subject.arenaId,
          arenaGeneration:
            input.subject.arenaGeneration,
          entityKey: input.subject.entityKey,
          entityGeneration:
            input.subject.entityGeneration,
          pathAnchorId: input.pathAnchorId,
          enabled: "$factor.recovery-enabled",
        },
      },
      observeStep(
        input,
        "observe-post-recovery",
        "post-recovery",
      ),
      completionProbe(input),
      cleanupStep(input),
    ],
    factors: [{
      id: "recovery-enabled",
      description:
        "Whether the stalled focal entity is relocated to the declared valid path anchor before the post-recovery observation window.",
    }],
    arms: [{
      id: "control",
      role: "control",
      factorValues: {
        "recovery-enabled": false,
      },
    }, {
      id: "treatment",
      role: "treatment",
      factorValues: {
        "recovery-enabled": true,
      },
    }],
    outcomePredicateIds: [
      "movement-resumed-after-recovery",
    ],
    expectedContrasts: [{
      predicateId: "movement-resumed-after-recovery",
      controlState: "absent",
      treatmentState: "present",
    }],
    evidenceRequirements: [
      ...baselineRequirements(
        input,
        "pre-recovery",
        "pre-recovery",
      ),
      ...baselineRequirements(
        input,
        "post-recovery",
        "post-recovery",
      ),
      {
        id: "pre-recovery-stall",
        predicateId: "navigation-stall-observed",
        state: "present",
        scope: {
          ...scope(input.subject),
          operationId: "pre-recovery",
        },
      },
      {
        id: "control-recovery-not-applied",
        predicateId: "navigation-recovery-applied",
        state: "absent",
        armIds: ["control"],
        scope: scope(input.subject),
      },
      {
        id: "treatment-recovery-applied",
        predicateId: "navigation-recovery-applied",
        state: "present",
        armIds: ["treatment"],
        scope: scope(input.subject),
      },
    ],
    minimumRunsPerArm:
      input.minimumRunsPerArm ?? 2,
  };
}

export function createNavigationCrowdingExperiment(
  input: EntityNavigationCrowdingExperimentInput,
): RuntimeExperimentDefinition {
  const controlCount =
    input.controlNearbyEntityCount ?? 0;
  const treatmentCount =
    input.treatmentNearbyEntityCount ?? 5;

  return {
    schemaVersion: 1,
    id: input.id,
    title: input.title,
    domain: "entity-ai",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    targetProfileFingerprint:
      input.targetProfileFingerprint,
    fixtureFingerprint:
      input.fixtureFingerprint,
    protocol: [
      ...commonSetup(input),
      {
        id: "configure-crowd",
        phase: "stimulus",
        actionId: "ai.configure-nearby-entity-count",
        parameters: {
          arenaId: input.subject.arenaId,
          entityKey: input.subject.entityKey,
          nearbyEntityCount:
            "$factor.nearby-entity-count",
        },
      },
      observeStep(
        input,
        "observe-crowd-window",
        "crowd-window",
      ),
      completionProbe(input),
      cleanupStep(input),
    ],
    factors: [{
      id: "nearby-entity-count",
      description:
        "Controlled nearby entity count around the focal pathing entity.",
    }],
    arms: [{
      id: "control",
      role: "control",
      factorValues: {
        "nearby-entity-count": controlCount,
      },
    }, {
      id: "treatment",
      role: "treatment",
      factorValues: {
        "nearby-entity-count": treatmentCount,
      },
    }],
    outcomePredicateIds: [
      "navigation-stall-observed",
    ],
    expectedContrasts: [{
      predicateId: "navigation-stall-observed",
      controlState: "absent",
      treatmentState: "present",
    }],
    evidenceRequirements:
      baselineRequirements(
        input,
        "crowd-window",
        "crowd-window",
      ),
    minimumRunsPerArm:
      input.minimumRunsPerArm ?? 2,
  };
}

function observed(
  evidence: readonly RuntimeEvidenceRecord[],
  predicate: string,
  expectedScope: RuntimeScope,
  state: "present" | "absent" = "present",
): RuntimeEvidenceRecord | undefined {
  return evidence.find(
    (record) =>
      record.predicate === predicate &&
      record.state === state &&
      record.confidence === "observed" &&
      runtimeScopeContains(
        record.scope,
        expectedScope,
      ),
  );
}

export function validateNavigationProgressEvidence(
  evidence: readonly RuntimeEvidenceRecord[],
  subject: EntityNavigationSubject,
  stallDisplacementThreshold = 0.25,
  operationId?: string,
): string[] {
  const errors: string[] = [];
  const expectedScope = {
    ...scope(subject),
    ...(operationId === undefined
      ? {}
      : { operationId }),
  };

  for (const predicate of [
    "navigation-target-valid",
    "navigation-goal-active",
    "navigation-chunk-ready",
    "navigation-progress-sampled",
  ]) {
    if (!observed(evidence, predicate, expectedScope)) {
      errors.push(
        "Navigation evidence is missing observed " +
          predicate +
          " for the focal entity scope.",
      );
    }
  }

  const progress = observed(
    evidence,
    "navigation-progress-sampled",
    expectedScope,
  );
  if (progress) {
    for (const key of [
      "windowTicks",
      "displacement",
      "distanceToTargetReduction",
      "velocityMagnitude",
      "nearbyEntityCount",
    ]) {
      const value = progress.measurements?.[key];
      if (
        value === undefined ||
        !Number.isFinite(value)
      ) {
        errors.push(
          "Navigation progress evidence is missing finite measurement " +
            key +
            ".",
        );
      }
    }
  }

  const stall = observed(
    evidence,
    "navigation-stall-observed",
    expectedScope,
  );
  if (stall && progress) {
    const displacement =
      progress.measurements?.displacement;
    const reduction =
      progress.measurements?.distanceToTargetReduction;
    if (
      displacement !== undefined &&
      displacement > stallDisplacementThreshold
    ) {
      errors.push(
        "Navigation stall evidence conflicts with displacement above the configured stall threshold.",
      );
    }
    if (
      reduction !== undefined &&
      reduction > stallDisplacementThreshold
    ) {
      errors.push(
        "Navigation stall evidence conflicts with meaningful distance-to-target reduction.",
      );
    }
  }

  const resumed = observed(
    evidence,
    "movement-resumed-after-recovery",
    expectedScope,
  );
  if (resumed && progress) {
    const displacement =
      progress.measurements?.displacement ?? 0;
    const reduction =
      progress.measurements?.distanceToTargetReduction ?? 0;
    if (
      displacement <= stallDisplacementThreshold &&
      reduction <= stallDisplacementThreshold
    ) {
      errors.push(
        "Movement-resumed evidence has no measured progress above the stall threshold.",
      );
    }
  }

  return errors;
}
