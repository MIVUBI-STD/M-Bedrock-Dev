import type {
  GameplayScenarioGraph,
} from "./inspection/gameplay-scenario-model.js";
import type {
  GameplayDefectResolutionGate,
} from "./inspection/gameplay-defect-resolution.js";
import {
  classifyGameplayIssue,
  type GameplayCapabilityDeliveryAssessment,
  type GameplayIssueFailureDomain,
  type GameplayIssueFlowStage,
} from "../../diagnostic-reasoning/src/index.js";
import {
  assessReadyResolutionSaturation,
} from "./map-audit-proof-saturation.js";
import {
  issueTypeFor,
  projectionContext,
  projectReadyAuditIssues,
  relatedCapabilityDelivery,
  sortIssues,
  type AuditIssueProjection,
  type NeedValidationAuditIssueProjection,
} from "./map-audit-issue-projection.js";

export function projectNeedValidationAuditIssues(
  graph: GameplayScenarioGraph,
  gate: GameplayDefectResolutionGate,
  capabilityDelivery:
    readonly GameplayCapabilityDeliveryAssessment[] = [],
): readonly NeedValidationAuditIssueProjection[] {
  const disproved = new Set(
    gate.blockingCounterProofIds,
  );
  const proven = new Set(
    gate.resolutions
      .filter((resolution) =>
        gate.confirmedDefectReadyIds.includes(
          resolution.causalLinkId,
        ) &&
        assessReadyResolutionSaturation(
          graph,
          resolution,
        ).saturated
      )
      .map((resolution) =>
        resolution.causalLinkId
      ),
  );
  const unsaturatedConfirmed = new Map(
    gate.resolutions
      .filter((resolution) =>
        gate.confirmedDefectReadyIds.includes(
          resolution.causalLinkId,
        )
      )
      .map((resolution) => [
        resolution.causalLinkId,
        assessReadyResolutionSaturation(
          graph,
          resolution,
        ),
      ])
      .filter(([, assessment]) =>
        !assessment.saturated
      ),
  );
  const translationRequired = new Set(
    gate.gameplayTranslationRequiredIds,
  );
  const counterProofResolutionRequired = new Set(
    gate.counterProofSearchRequiredIds,
  );

  return sortIssues(
    graph.causalLinks.flatMap((link) => {
      if (
        disproved.has(link.id) ||
        proven.has(link.id)
      ) {
        return [];
      }

      const needsTranslation =
        translationRequired.has(link.id);
      const needsCounterProofResolution =
        counterProofResolutionRequired.has(link.id);
      const saturationAssessment =
        unsaturatedConfirmed.get(link.id);
      const needsFamilyProof =
        saturationAssessment !== undefined;
      const contradicted =
        link.status === "CONTRADICTED";

      // RUNTIME_BLOCKED and DETECTION_GAP are audit obligations, not issues.
      // A NEED_VALIDATION finding requires an actual contradicted dependency
      // or a confirmation-ready resolution that is still missing proof.
      if (
        !contradicted &&
        !needsFamilyProof
      ) {
        return [];
      }

      if (
        !needsTranslation &&
        !needsCounterProofResolution &&
        !needsFamilyProof &&
        !contradicted
      ) {
        return [];
      }

      const context = projectionContext(
        graph,
        link.id,
        capabilityDelivery,
      );
      if (context === undefined) return [];

      const {
        scenario,
        subjectIds,
        componentIds,
        playerFacingEvidenceIds,
        informationMismatch,
        classification,
        issueType,
      } = context;

      const suppliedResolution = gate.resolutions.find(
        (item) => item.causalLinkId === link.id,
      );
      const validationReason =
        needsFamilyProof
          ? "The contradiction is otherwise confirmation-ready, but minimum family-specific proof is not yet fully evidenced."
          : needsTranslation
          ? "A source contradiction exists, but the player-facing defect contract is not complete enough for final confirmation."
          : needsCounterProofResolution
            ? "A material contradiction exists, but bounded counter-proof search is not yet complete."
            : suppliedResolution?.runtimeReason ??
              suppliedResolution?.detectionGapReason ??
              "Material contradiction remains unresolved.";

      const missingProof =
        needsFamilyProof
          ? "Family proof criteria: " +
            saturationAssessment!.missingFamilyCriteriaIds.join(", ") +
            (saturationAssessment!.missingUniversalCriteriaIds.length > 0
              ? "; universal criteria: " +
                saturationAssessment!.missingUniversalCriteriaIds.join(", ")
              : "")
          : needsTranslation
          ? "Complete gameplay trigger, expected/actual behavior, player consequence, and affected scope."
          : needsCounterProofResolution
            ? "Bounded search proving whether any reachable guard/owner/scope/generation/cleanup/exclusion prevents the wrong state."
            : "Deciding evidence that closes the remaining contradiction proof.";

      const validationTest =
        needsFamilyProof
          ? "Resolve only the missing family proof criteria for '" +
            scenario.label +
            "': " +
            saturationAssessment!.missingFamilyCriteriaIds.join(", ") +
            ". Bind each satisfied criterion to concrete selected-artifact evidence before promotion."
          : suppliedResolution?.narrowRuntimeQuestion ??
        (
          "Exercise scenario '" +
          scenario.label +
          "' and directly verify: " +
          link.purpose +
          ". Treat any observed violation as the deciding evidence for promotion to PROVEN."
        );

      return [{
        status: "NEED_VALIDATION" as const,
        issueType,
        failureDomain:
          classification.failureDomain,
        contributingDomains:
          classification.contributingDomains,
        gameplayFlow:
          classification.gameplayFlow,
        informationMismatch,
        playerFacingEvidenceIds,
        causalLinkId: link.id,
        scenarioId: scenario.id,
        gameplayStage: scenario.gameplayStage,
        scenarioLabel: scenario.label,
        gameplayTrigger: scenario.purpose,
        gameplayConsequence:
          "Potential player-visible failure remains unresolved for this required gameplay dependency.",
        expectedOutcome: link.purpose,
        actualOutcome: link.reason,
        affectedScope:
          [...new Set([
            ...subjectIds,
            ...componentIds,
          ])].sort().join(", "),
        subjectIds,
        componentIds,
        evidenceIds: [...new Set(link.evidenceIds)].sort(),
        ...(link.knowledgeRequirementId === undefined
          ? {}
          : {
              knowledgeRequirementId:
                link.knowledgeRequirementId,
            }),
        validationReason,
        missingProof,
        validationTest,
        validationGroupKey:
          scenario.id +
          ":" +
          (
            link.knowledgeRequirementId ??
            classification.failureDomain
          ),
      }];
    }),
  );
}

/**
 * Compatibility alias for callers that previously requested "all" unresolved
 * issues. Audit/model/coverage gaps are no longer coerced into BUG findings;
 * they are owned by deriveAuditObligations().
 */
export function projectAllNeedValidationAuditIssues(
  graph: GameplayScenarioGraph,
  gate: GameplayDefectResolutionGate,
  capabilityDelivery:
    readonly GameplayCapabilityDeliveryAssessment[] = [],
): readonly NeedValidationAuditIssueProjection[] {
  return projectNeedValidationAuditIssues(
    graph,
    gate,
    capabilityDelivery,
  );
}

export function projectAllAuditIssues(
  graph: GameplayScenarioGraph,
  gate: GameplayDefectResolutionGate,
  capabilityDelivery:
    readonly GameplayCapabilityDeliveryAssessment[] = [],
): readonly AuditIssueProjection[] {
  return sortIssues([
    ...projectReadyAuditIssues(
      graph,
      gate,
      capabilityDelivery,
    ),
    ...projectAllNeedValidationAuditIssues(
      graph,
      gate,
      capabilityDelivery,
    ),
  ]);
}
