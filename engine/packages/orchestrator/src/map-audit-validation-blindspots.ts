import type {
  GameplayDiscoveryChallengeSignal,
} from "./inspection/gameplay-discovery-challenger.js";
import type {
  SharedResourceOwnershipSignal,
} from "./inspection/shared-resource-ownership.js";
import {
  sortIssues,
  type NeedValidationAuditIssueProjection,
} from "./map-audit-issue-projection.js";

export function projectBlindSpotNeedValidationIssues(input: {
  readonly discoveryChallenges:
    readonly GameplayDiscoveryChallengeSignal[];
  readonly sharedResourceSignals:
    readonly SharedResourceOwnershipSignal[];
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

  return sortIssues([
    ...discovery,
    ...shared,
  ]);
}
