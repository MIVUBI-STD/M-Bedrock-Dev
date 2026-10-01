import type {
  RuntimeActionCapability,
  RuntimeActionCapabilityRegistry,
} from "../../core/action-capability.js";
import type {
  RuntimeExperimentDefinition,
} from "../../core/types.js";

export interface PersistenceRecoverySubject {
  recordKey: string;
  playerKey: string;
  arenaId: string;
  arenaGeneration: number;
  bootGeneration: number;
}

export interface PersistenceRecoveryExperimentInput {
  id: string;
  title: string;
  targetProfileFingerprint: string;
  fixtureFingerprint: string;
  objectiveId: string;
  participant: string;
  subject: PersistenceRecoverySubject;
  minimumRunsPerArm?: number;
}

export interface OrphanResourceExperimentInput
  extends PersistenceRecoveryExperimentInput {
  resourceKey: string;
}

export const PERSISTENCE_RECOVERY_ACTION_CAPABILITIES:
  readonly RuntimeActionCapability[] = [{
    id: "persistence.reset-recovery-fixture",
    description:
      "Reset controlled durable records, transient state, journals, orphan resources, and recovery counters for the fixture.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["setup"],
    requiredParameters: {
      recordKey: "string",
      playerKey: "string",
      arenaId: "string",
      arenaGeneration: "number",
      bootGeneration: "number",
    },
  }, {
    id: "persistence.write-durable-record",
    description:
      "Write a schema-versioned durable record that is expected to survive runtime reload.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      recordKey: "string",
      playerKey: "string",
      arenaId: "string",
      schemaVersion: "number",
      recordGeneration: "number",
      durableValue: "number",
    },
  }, {
    id: "persistence.seed-transient-session-state",
    description:
      "Seed controlled transient session state that must not be restored as current authority after reload.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      playerKey: "string",
      arenaId: "string",
      ready: "boolean",
      pendingTeleport: "boolean",
    },
  }, {
    id: "persistence.prepare-journal",
    description:
      "Persist PREPARED intent for a controlled non-idempotent side effect before applying it.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      recordKey: "string",
      journalGeneration: "number",
    },
  }, {
    id: "persistence.apply-journal-side-effect",
    description:
      "Apply the controlled journal side effect once and emit exact apply-count evidence.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      recordKey: "string",
      journalGeneration: "number",
    },
  }, {
    id: "persistence.reload-runtime",
    description:
      "Reload/restart the controlled runtime fixture and resume after worldLoad under the declared new bootGeneration.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      previousBootGeneration: "number",
      bootGeneration: "number",
    },
  }, {
    id: "persistence.reconcile-worldload",
    description:
      "Reconcile durable and transient state after worldLoad, optionally enforcing durable/transient ownership filtering.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      recordKey: "string",
      playerKey: "string",
      arenaId: "string",
      bootGeneration: "number",
      reconciliationEnabled: "boolean",
    },
  }, {
    id: "persistence.recover-journal",
    description:
      "Recover a pre-reload journal against actual world state, optionally enforcing idempotent/generation-safe reconciliation.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      recordKey: "string",
      journalGeneration: "number",
      bootGeneration: "number",
      idempotentRecoveryEnabled: "boolean",
    },
  }, {
    id: "persistence.seed-orphan-resource",
    description:
      "Seed a controlled pack-owned temporary resource attributed to the previous boot.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      resourceKey: "string",
      bootGeneration: "number",
    },
  }, {
    id: "persistence.reconcile-orphan-resources",
    description:
      "Enumerate and reconcile pack-owned orphan resources under the new boot generation.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      resourceKey: "string",
      previousBootGeneration: "number",
      bootGeneration: "number",
      reconciliationEnabled: "boolean",
    },
  }, {
    id: "persistence.cleanup-recovery-fixture",
    description:
      "Clear fixture-owned durable/transient/journal/orphan state after the controlled experiment.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["teardown"],
    requiredParameters: {
      recordKey: "string",
      playerKey: "string",
      arenaId: "string",
    },
  }];

export const PERSISTENCE_RECOVERY_CAPABILITY_REGISTRY:
  RuntimeActionCapabilityRegistry = {
    schemaVersion: 1,
    actions: PERSISTENCE_RECOVERY_ACTION_CAPABILITIES,
  };

function nextBoot(
  input: PersistenceRecoveryExperimentInput,
): number {
  return input.subject.bootGeneration + 1;
}

function resetStep(
  input: PersistenceRecoveryExperimentInput,
) {
  return {
    id: "reset-recovery-fixture",
    phase: "setup" as const,
    actionId: "persistence.reset-recovery-fixture",
    parameters: {
      recordKey: input.subject.recordKey,
      playerKey: input.subject.playerKey,
      arenaId: input.subject.arenaId,
      arenaGeneration:
        input.subject.arenaGeneration,
      bootGeneration:
        input.subject.bootGeneration,
    },
  };
}

function reloadStep(
  input: PersistenceRecoveryExperimentInput,
) {
  return {
    id: "reload-runtime",
    phase: "stimulus" as const,
    actionId: "persistence.reload-runtime",
    parameters: {
      previousBootGeneration:
        input.subject.bootGeneration,
      bootGeneration: nextBoot(input),
    },
  };
}

function completionProbe(
  input: PersistenceRecoveryExperimentInput,
  predicate: string,
) {
  return {
    id: "probe-persistence-outcome",
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

function cleanupStep(
  input: PersistenceRecoveryExperimentInput,
) {
  return {
    id: "cleanup-recovery-fixture",
    phase: "teardown" as const,
    actionId: "persistence.cleanup-recovery-fixture",
    parameters: {
      recordKey: input.subject.recordKey,
      playerKey: input.subject.playerKey,
      arenaId: input.subject.arenaId,
    },
  };
}

export function createReloadReconciliationExperiment(
  input: PersistenceRecoveryExperimentInput,
): RuntimeExperimentDefinition {
  const newBoot = nextBoot(input);
  const recoveredScope = {
    playerKey: input.subject.playerKey,
    arenaId: input.subject.arenaId,
    arenaGeneration:
      input.subject.arenaGeneration,
    bootGeneration: newBoot,
  };

  return {
    schemaVersion: 1,
    id: input.id,
    title: input.title,
    domain: "persistence",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    targetProfileFingerprint:
      input.targetProfileFingerprint,
    fixtureFingerprint:
      input.fixtureFingerprint,
    protocol: [
      resetStep(input),
      {
        id: "write-durable-record",
        phase: "stimulus",
        actionId: "persistence.write-durable-record",
        parameters: {
          recordKey: input.subject.recordKey,
          playerKey: input.subject.playerKey,
          arenaId: input.subject.arenaId,
          schemaVersion: 1,
          recordGeneration: 1,
          durableValue: 42,
        },
      },
      {
        id: "seed-transient-session-state",
        phase: "stimulus",
        actionId:
          "persistence.seed-transient-session-state",
        parameters: {
          playerKey: input.subject.playerKey,
          arenaId: input.subject.arenaId,
          ready: true,
          pendingTeleport: true,
        },
      },
      reloadStep(input),
      {
        id: "reconcile-worldload",
        phase: "stimulus",
        actionId: "persistence.reconcile-worldload",
        parameters: {
          recordKey: input.subject.recordKey,
          playerKey: input.subject.playerKey,
          arenaId: input.subject.arenaId,
          bootGeneration: newBoot,
          reconciliationEnabled:
            "$factor.reconciliation-enabled",
        },
      },
      completionProbe(
        input,
        "stale-transient-state-restored-observed",
      ),
      cleanupStep(input),
    ],
    factors: [{
      id: "reconciliation-enabled",
      description:
        "Whether worldLoad recovery filters durable state from transient session authority and rebinds it to the new boot.",
    }],
    arms: [{
      id: "control",
      role: "control",
      factorValues: {
        "reconciliation-enabled": true,
      },
    }, {
      id: "treatment",
      role: "treatment",
      factorValues: {
        "reconciliation-enabled": false,
      },
    }],
    outcomePredicateIds: [
      "stale-transient-state-restored-observed",
    ],
    expectedContrasts: [{
      predicateId:
        "stale-transient-state-restored-observed",
      controlState: "absent",
      treatmentState: "present",
    }],
    evidenceRequirements: [{
      id: "new-boot-active",
      predicateId: "boot-generation-active",
      state: "present",
      scope: {
        bootGeneration: newBoot,
      },
    }, {
      id: "durable-record-restored",
      predicateId: "durable-record-restored",
      state: "present",
      scope: recoveredScope,
      measurements: {
        schemaVersion: { equals: 1 },
        recordGeneration: { equals: 1 },
        durableValue: { equals: 42 },
      },
    }, {
      id: "worldload-recovery-entered",
      predicateId: "worldload-recovery-entered",
      state: "present",
      scope: {
        bootGeneration: newBoot,
      },
    }, {
      id: "control-transient-state-cleared",
      predicateId: "transient-session-state-cleared",
      state: "present",
      armIds: ["control"],
      scope: recoveredScope,
    }],
    minimumRunsPerArm:
      input.minimumRunsPerArm ?? 2,
  };
}

export function createJournalCrashRecoveryExperiment(
  input: PersistenceRecoveryExperimentInput,
): RuntimeExperimentDefinition {
  const newBoot = nextBoot(input);
  const journalGeneration = 1;

  return {
    schemaVersion: 1,
    id: input.id,
    title: input.title,
    domain: "persistence",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    targetProfileFingerprint:
      input.targetProfileFingerprint,
    fixtureFingerprint:
      input.fixtureFingerprint,
    protocol: [
      resetStep(input),
      {
        id: "prepare-journal",
        phase: "stimulus",
        actionId: "persistence.prepare-journal",
        parameters: {
          recordKey: input.subject.recordKey,
          journalGeneration,
        },
      },
      {
        id: "apply-side-effect",
        phase: "stimulus",
        actionId:
          "persistence.apply-journal-side-effect",
        parameters: {
          recordKey: input.subject.recordKey,
          journalGeneration,
        },
      },
      reloadStep(input),
      {
        id: "recover-journal",
        phase: "stimulus",
        actionId: "persistence.recover-journal",
        parameters: {
          recordKey: input.subject.recordKey,
          journalGeneration,
          bootGeneration: newBoot,
          idempotentRecoveryEnabled:
            "$factor.idempotent-recovery-enabled",
        },
      },
      completionProbe(
        input,
        "duplicate-apply-after-reload-observed",
      ),
      cleanupStep(input),
    ],
    factors: [{
      id: "idempotent-recovery-enabled",
      description:
        "Whether recovery reconciles the journal against actual applied world state before deciding to re-apply.",
    }],
    arms: [{
      id: "control",
      role: "control",
      factorValues: {
        "idempotent-recovery-enabled": true,
      },
    }, {
      id: "treatment",
      role: "treatment",
      factorValues: {
        "idempotent-recovery-enabled": false,
      },
    }],
    outcomePredicateIds: [
      "duplicate-apply-after-reload-observed",
    ],
    expectedContrasts: [{
      predicateId:
        "duplicate-apply-after-reload-observed",
      controlState: "absent",
      treatmentState: "present",
    }],
    evidenceRequirements: [{
      id: "journal-prepared-before-apply",
      predicateId: "persistence-journal-prepared",
      state: "present",
      scope: {
        bootGeneration:
          input.subject.bootGeneration,
        operationId: "journal-prepared",
      },
      measurements: {
        journalGeneration: {
          equals: journalGeneration,
        },
      },
    }, {
      id: "side-effect-applied-before-reload",
      predicateId: "persistence-side-effect-applied",
      state: "present",
      scope: {
        bootGeneration:
          input.subject.bootGeneration,
        operationId: "side-effect-apply",
      },
      measurements: {
        applyCount: { equals: 1 },
      },
    }, {
      id: "recovery-entered-new-boot",
      predicateId: "persistence-journal-recovery-entered",
      state: "present",
      scope: {
        bootGeneration: newBoot,
        operationId: "journal-recovery",
      },
    }, {
      id: "control-recovery-converged",
      predicateId: "persistence-recovery-converged",
      state: "present",
      armIds: ["control"],
      scope: {
        bootGeneration: newBoot,
        operationId: "journal-recovery",
      },
      measurements: {
        finalApplyCount: { equals: 1 },
      },
    }],
    minimumRunsPerArm:
      input.minimumRunsPerArm ?? 2,
  };
}

export function createOrphanResourceRecoveryExperiment(
  input: OrphanResourceExperimentInput,
): RuntimeExperimentDefinition {
  const newBoot = nextBoot(input);

  return {
    schemaVersion: 1,
    id: input.id,
    title: input.title,
    domain: "persistence",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    targetProfileFingerprint:
      input.targetProfileFingerprint,
    fixtureFingerprint:
      input.fixtureFingerprint,
    protocol: [
      resetStep(input),
      {
        id: "seed-orphan-resource",
        phase: "stimulus",
        actionId: "persistence.seed-orphan-resource",
        parameters: {
          resourceKey: input.resourceKey,
          bootGeneration:
            input.subject.bootGeneration,
        },
      },
      reloadStep(input),
      {
        id: "reconcile-orphan-resources",
        phase: "stimulus",
        actionId:
          "persistence.reconcile-orphan-resources",
        parameters: {
          resourceKey: input.resourceKey,
          previousBootGeneration:
            input.subject.bootGeneration,
          bootGeneration: newBoot,
          reconciliationEnabled:
            "$factor.orphan-reconciliation-enabled",
        },
      },
      completionProbe(
        input,
        "orphan-resource-retained-observed",
      ),
      cleanupStep(input),
    ],
    factors: [{
      id: "orphan-reconciliation-enabled",
      description:
        "Whether worldLoad recovery enumerates and removes/adopts pack-owned resources from the previous boot.",
    }],
    arms: [{
      id: "control",
      role: "control",
      factorValues: {
        "orphan-reconciliation-enabled": true,
      },
    }, {
      id: "treatment",
      role: "treatment",
      factorValues: {
        "orphan-reconciliation-enabled": false,
      },
    }],
    outcomePredicateIds: [
      "orphan-resource-retained-observed",
    ],
    expectedContrasts: [{
      predicateId:
        "orphan-resource-retained-observed",
      controlState: "absent",
      treatmentState: "present",
    }],
    evidenceRequirements: [{
      id: "orphan-seeded-old-boot",
      predicateId: "orphan-resource-seeded",
      state: "present",
      scope: {
        bootGeneration:
          input.subject.bootGeneration,
        operationId: "orphan-seed",
      },
      measurements: {
        seededResources: { equals: 1 },
      },
    }, {
      id: "orphan-scan-new-boot",
      predicateId: "orphan-resource-scan-complete",
      state: "present",
      scope: {
        bootGeneration: newBoot,
        operationId: "orphan-reconcile",
      },
      measurements: {
        discoveredResources: { min: 1 },
      },
    }, {
      id: "control-no-orphans-remain",
      predicateId: "orphan-resource-count-sampled",
      state: "present",
      armIds: ["control"],
      scope: {
        bootGeneration: newBoot,
        operationId: "orphan-reconcile",
      },
      measurements: {
        remainingOrphans: { equals: 0 },
      },
    }],
    minimumRunsPerArm:
      input.minimumRunsPerArm ?? 2,
  };
}
