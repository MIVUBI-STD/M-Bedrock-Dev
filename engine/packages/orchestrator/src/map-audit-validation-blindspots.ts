import type {
  GameplayDiscoveryChallengeSignal,
} from "./inspection/gameplay-discovery-challenger.js";
import type {
  SharedResourceOwnershipSignal,
} from "./inspection/shared-resource-ownership.js";
import type {
  AccumulationGrowthSignal,
  CompoundBoundarySignal,
} from "./inspection/gameplay-compound-growth-analysis.js";
import {
  sortIssues,
  type NeedValidationAuditIssueProjection,
} from "./map-audit-issue-projection.js";

export function projectBlindSpotNeedValidationIssues(input: {
  readonly discoveryChallenges:
    readonly GameplayDiscoveryChallengeSignal[];
  readonly sharedResourceSignals:
    readonly SharedResourceOwnershipSignal[];
  readonly compoundBoundaries?:
    readonly CompoundBoundarySignal[];
  readonly accumulationGrowth?:
    readonly AccumulationGrowthSignal[];
  readonly replicaDivergenceIds?: readonly string[];
}): readonly NeedValidationAuditIssueProjection[] {
  const discovery = input.discoveryChallenges.map((signal) => ({
    status: "NEED_VALIDATION" as const,
    issueType: "BUG" as const,
    failureDomain:
      signal.kind === "unowned-temporal-relation"
        ? "temporal-async" as const
        : "state-ownership" as const,
    contributingDomains:
      signal.kind === "unowned-temporal-relation"
        ? ["temporal-async" as const, "state-ownership" as const]
        : ["state-ownership" as const],
    gameplayFlow:
      signal.kind === "unowned-temporal-relation"
        ? "RECOVERY" as const
        : "ACTIVE_GAMEPLAY" as const,
    informationMismatch: false,
    playerFacingEvidenceIds: [],
    causalLinkId: signal.id,
    scenarioId:
      "discovery-challenge:" + signal.subjectId,
    gameplayStage:
      signal.kind === "unowned-temporal-relation"
        ? "RECOVERY"
        : "ACTIVE_GAMEPLAY",
    scenarioLabel: signal.kind,
    gameplayTrigger:
      "Trace the selected-artifact behavior represented by " +
      signal.subjectId +
      " from its raw execution/state evidence into a concrete gameplay owner.",
    gameplayConsequence:
      "Raw executable evidence exists outside the current semantic/scenario ownership graph, so a real gameplay defect could remain completely undiscovered.",
    expectedOutcome:
      "Every material executable/state/temporal evidence item has a semantic gameplay owner or an explicit not-applicable disposition.",
    actualOutcome: signal.reason,
    affectedScope: signal.subjectId,
    subjectIds: [signal.subjectId],
    componentIds: [],
    evidenceIds: [...signal.evidenceIds],
    validationReason:
      "Discovery Challenger found selected-artifact evidence with no sufficient semantic/scenario owner.",
    missingProof:
      "The gameplay purpose, owner, downstream effect, and scenario/causal relationship for this raw evidence.",
    validationTest:
      "Resolve " +
      signal.subjectId +
      " into its player-visible gameplay effect. If it mutates material gameplay, add it to the semantic/scenario model and re-run contradiction analysis.",
    validationGroupKey:
      "discovery-challenge:" + signal.subjectId,
  }));

  const shared = input.sharedResourceSignals.map((signal) => {
    const temporal =
      signal.kind ===
      "deferred-writer-without-generation-proof";
    return {
      status: "NEED_VALIDATION" as const,
      issueType: "BUG" as const,
      failureDomain:
        temporal
          ? "temporal-async" as const
          : "state-ownership" as const,
      contributingDomains: [
        "state-ownership" as const,
        ...(temporal
          ? ["temporal-async" as const]
          : []),
      ],
      gameplayFlow:
        temporal
          ? "RECOVERY" as const
          : "ACTIVE_GAMEPLAY" as const,
      informationMismatch: false,
      playerFacingEvidenceIds: [],
      causalLinkId: signal.id,
      scenarioId:
        "shared-resource:" + signal.surfaceId,
      gameplayStage:
        temporal
          ? "RECOVERY"
          : "ACTIVE_GAMEPLAY",
      scenarioLabel: signal.kind,
      gameplayTrigger:
        "Exercise lifecycle paths that allow the listed execution regions to access " +
        signal.surfaceId +
        ".",
      gameplayConsequence:
        signal.kind === "higher-order-shared-resource"
          ? "Three or more execution regions converge on one shared state resource, so a defect may require higher-order ordering rather than a pairwise check."
          : "Multiple or deferred writers can mutate the same material state without enough authority/generation proof.",
      expectedOutcome:
        "Shared material state has explicit ownership, mutually safe writers, lifecycle boundaries, and commit-time generation/authority validation.",
      actualOutcome: signal.reason,
      affectedScope: signal.surfaceId,
      subjectIds: [signal.surfaceId],
      componentIds: [...signal.regionIds],
      evidenceIds: [...signal.evidenceIds],
      validationReason:
        "Reverse shared-resource ownership analysis found unresolved write ownership/interleaving risk.",
      missingProof:
        "Mutual exclusion, authoritative ownership, generation scope, and ordering proof across writers: " +
        signal.regionIds.join(", ") +
        ".",
      validationTest:
        "Exercise the shared-resource lifecycle around writer overlap, cleanup/retry/reconnect/reuse, and verify whether stale or competing writes can alter the wrong run/player/arena state.",
      validationGroupKey:
        "shared-resource:" + signal.surfaceId,
    };
  });

  const compound = (input.compoundBoundaries ?? []).map((signal) => ({
    status: "NEED_VALIDATION" as const,
    issueType: "BUG" as const,
    failureDomain: "boundary-capacity" as const,
    contributingDomains: ["boundary-capacity" as const],
    gameplayFlow: "READY_START" as const,
    informationMismatch: false,
    playerFacingEvidenceIds: [],
    causalLinkId: signal.id,
    scenarioId: "compound-boundary",
    gameplayStage: "READY_START",
    scenarioLabel: "compound-boundary",
    gameplayTrigger:
      "Exercise the combined boundary dimensions together: " +
      signal.dimensions.join(", ") +
      ".",
    gameplayConsequence:
      "Single-axis tests may pass while the combined resource/capacity boundary fails.",
    expectedOutcome:
      "Combined gameplay capacity remains consistent with the grounded visible/design contract.",
    actualOutcome: signal.reason,
    affectedScope: signal.dimensions.join(", "),
    subjectIds: [...signal.dimensions],
    componentIds: [],
    evidenceIds: [...signal.evidenceIds],
    validationReason:
      "Compound-boundary analysis found a multi-dimensional capacity interaction that is not closed by single-boundary proof.",
    missingProof:
      "Behavior at the combined boundary and whether the effective limit contradicts the player-visible/design contract.",
    validationTest:
      "Test the combined boundary at the grounded safe point and the next combined step; fail if gameplay capacity or progression breaks while each individual axis remains within its apparent limit.",
    validationGroupKey: signal.id,
  }));

  const replicaDivergence =
    (input.replicaDivergenceIds ?? []).map((id) => ({
      status: "NEED_VALIDATION" as const,
      issueType: "BUG" as const,
      failureDomain: "world-structure-mutation" as const,
      contributingDomains: [
        "world-structure-mutation" as const,
      ],
      gameplayFlow: "SETUP" as const,
      informationMismatch: false,
      playerFacingEvidenceIds: [],
      causalLinkId: id,
      scenarioId: "full-map-replica",
      gameplayStage: "SETUP",
      scenarioLabel:
        "replica-divergence-classification",
      gameplayTrigger:
        "Compare the divergent replica against the canonical baseline in its actual gameplay role.",
      gameplayConsequence:
        "A world/topology difference exists but its gameplay significance has not yet been classified, so baseline proof cannot safely be inherited.",
      expectedOutcome:
        "Every replica divergence is either grounded as non-material/expected or translated into a concrete gameplay consequence.",
      actualOutcome:
        "Replica divergence remains semantically unclassified.",
      affectedScope: id,
      subjectIds: [id],
      componentIds: [],
      evidenceIds: [id],
      validationReason:
        "Full-map replica proof found a divergence that still requires semantic/gameplay classification.",
      missingProof:
        "Grounded evidence showing whether the divergence is non-material/expected or affects a player-visible gameplay dependency.",
      validationTest:
        "Trace the divergent world/topology cells or records to their gameplay purpose. If no player-visible/material dependency is affected, document the non-material rationale; otherwise route the grounded consequence into causal PROVE.",
      validationGroupKey:
        "full-map-replica:" + id,
    }));

  const accumulation = (input.accumulationGrowth ?? []).map((signal) => ({
    status: "NEED_VALIDATION" as const,
    issueType: "BUG" as const,
    failureDomain: "persistence-recovery" as const,
    contributingDomains: [
      "persistence-recovery" as const,
      "state-ownership" as const,
    ],
    gameplayFlow: "CLEANUP_REPLAY" as const,
    informationMismatch: false,
    playerFacingEvidenceIds: [],
    causalLinkId: signal.id,
    scenarioId: "accumulation-growth",
    gameplayStage: "CLEANUP_REPLAY",
    scenarioLabel: "accumulation-growth",
    gameplayTrigger:
      "Repeat the owning lifecycle for " +
      signal.subjectId +
      ".",
    gameplayConsequence:
      "State/resources may accumulate across runs even when early runs appear healthy.",
    expectedOutcome:
      "Per-run/session producers are balanced by clear/release/cleanup before reuse.",
    actualOutcome: signal.reason,
    affectedScope: signal.subjectId,
    subjectIds: [signal.subjectId],
    componentIds: [],
    evidenceIds: [...signal.evidenceIds],
    validationReason:
      "Growth analysis found producer/cleanup imbalance or append-without-clear semantics.",
    missingProof:
      "A grounded balancing cleanup/reset path, or mathematical proof that repeated runs do not accumulate state/resources.",
    validationTest:
      "Run the lifecycle repeatedly or prove producer/consumer balance statically; fail if state/resource count grows across equivalent runs.",
    validationGroupKey: signal.id,
  }));

  return sortIssues([
    ...discovery,
    ...shared,
    ...compound,
    ...accumulation,
    ...replicaDivergence,
  ]);
}
