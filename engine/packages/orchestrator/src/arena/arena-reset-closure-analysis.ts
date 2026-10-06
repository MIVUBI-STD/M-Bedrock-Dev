export type ArenaResetClosureStatus =
  | "complete"
  | "partial"
  | "unresolved";

export type ArenaReuseEligibility =
  | "reusable"
  | "quarantined";

export interface ArenaResetClosureAssessment {
  status: ArenaResetClosureStatus;
  reuseEligibility: ArenaReuseEligibility;
  requiresRecovery: boolean;
  blockers: readonly string[];
  warnings: readonly string[];
  surfaces: {
    cleanupLedgerMissing: number;
    cleanupLifecycleUnresolved: number;
    inventoryResetGaps: number;
    loadoutTransactionGaps: number;
    capabilityCleanupGaps: number;
    staleReviveContradictions: number;
    reviveAfterDeathContradictions: number;
    projectileCleanupGaps: number;
    inputLockRisks: number;
    staleFormResponseGaps: number;
    repeatedInputRisks: number;
    unguardedDeferredChunkWork: number;
    entityRemoveTerminalizationRisks: number;
    globalRuleConflicts: number;
    baselineRestoreVerificationGaps: number;
  };
}

export function assessArenaResetClosure(input: {
  cleanup: {
    ledger?: { missing: number; partial: number };
    lifecycle: { unresolved: number };
  };
  inventory: {
    unresolvedResetPairs: number;
    unresolvedLoadoutTransactions: number;
  };
  capability: {
    unguardedMutationRegions: number;
  };
  combat: {
    staleReviveContradictions: number;
    reviveAfterDeathContradictions: number;
    projectileCleanupContractGap: number;
  };
  interaction: {
    directInputLockRisks: number;
    staleFormResponseGaps: number;
    repeatedInputRisks: number;
  };
  chunk: {
    unguardedDeferredChunkWork: number;
    entityRemoveTerminalizationRisks: number;
  };
  worldRules: {
    conflictingGlobalRules: number;
  };
  baselineRestore: {
    candidates: number;
    verified: number;
    unresolved: number;
  };
}): ArenaResetClosureAssessment {
  const surfaces = {
    cleanupLedgerMissing:
      input.cleanup.ledger?.missing ?? 0,
    cleanupLifecycleUnresolved:
      input.cleanup.lifecycle.unresolved,
    inventoryResetGaps:
      input.inventory.unresolvedResetPairs,
    loadoutTransactionGaps:
      input.inventory.unresolvedLoadoutTransactions,
    capabilityCleanupGaps:
      input.capability.unguardedMutationRegions,
    staleReviveContradictions:
      input.combat.staleReviveContradictions,
    reviveAfterDeathContradictions:
      input.combat.reviveAfterDeathContradictions,
    projectileCleanupGaps:
      input.combat.projectileCleanupContractGap,
    inputLockRisks:
      input.interaction.directInputLockRisks,
    staleFormResponseGaps:
      input.interaction.staleFormResponseGaps,
    repeatedInputRisks:
      input.interaction.repeatedInputRisks,
    unguardedDeferredChunkWork:
      input.chunk.unguardedDeferredChunkWork,
    entityRemoveTerminalizationRisks:
      input.chunk.entityRemoveTerminalizationRisks,
    globalRuleConflicts:
      input.worldRules.conflictingGlobalRules,
    baselineRestoreVerificationGaps:
      input.baselineRestore.unresolved,
  };

  const blockers = Object.entries(surfaces)
    .filter(([, value]) => value > 0)
    .map(([key]) => key)
    .sort();
  const warnings =
    (input.cleanup.ledger?.partial ?? 0) > 0
      ? ["cleanupLedgerPartial"]
      : [];

  const status:
    ArenaResetClosureStatus =
      blockers.length > 0
        ? "unresolved"
        : warnings.length > 0
          ? "partial"
          : "complete";

  return {
    status,
    reuseEligibility:
      status === "complete"
        ? "reusable"
        : "quarantined",
    requiresRecovery:
      status !== "complete",
    blockers,
    warnings,
    surfaces,
  };
}
