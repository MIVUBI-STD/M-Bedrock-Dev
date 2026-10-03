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
  const runtimeResolutionRequired = new Set(
    gate.runtimeProofRequiredIds,
  );
  const detectionResolutionRequired = new Set(
    gate.detectionGapIds,
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

      const isRuntime =
        link.status === "RUNTIME_BLOCKED";
      const isGap =
        link.status === "DETECTION_GAP";
      const needsTranslation =
        translationRequired.has(link.id);
      const needsRuntimeResolution =
        runtimeResolutionRequired.has(link.id);
      const needsDetectionResolution =
        detectionResolutionRequired.has(link.id);
      const needsCounterProofResolution =
        counterProofResolutionRequired.has(link.id);
      const saturationAssessment =
        unsaturatedConfirmed.get(link.id);
      const needsFamilyProof =
        saturationAssessment !== undefined;

      if (
        !isRuntime &&
        !isGap &&
        !needsTranslation &&
        !needsRuntimeResolution &&
        !needsDetectionResolution &&
        !needsCounterProofResolution &&
        !needsFamilyProof
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
            : needsRuntimeResolution || isRuntime
              ? suppliedResolution?.runtimeReason ??
                "The dependency cannot be decided safely from static/package evidence and requires one runtime observation."
              : needsDetectionResolution || isGap
                ? suppliedResolution?.detectionGapReason ??
                  "The selected artifact exposes an unresolved semantic/detection gap for this gameplay dependency."
                : "Material proof remains unresolved.";

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
            : needsRuntimeResolution || isRuntime
              ? "Observed runtime outcome for the unresolved dependency."
              : "Evidence that resolves the unsupported or semantically unknown dependency.";

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

function syntheticNeedValidationFromKnowledge(
  graph: GameplayScenarioGraph,
  capabilityDelivery:
    readonly GameplayCapabilityDeliveryAssessment[],
): readonly NeedValidationAuditIssueProjection[] {
  return graph.knowledgeReceipts.flatMap((receipt) => {
    if (receipt.status === "SATISFIED") {
      return [];
    }

    const requirement = graph.knowledgeRequirements.find(
      (item) => item.id === receipt.requirementId,
    );
    const scenario = graph.scenarios.find(
      (item) => item.id === receipt.scenarioId,
    );
    if (requirement === undefined || scenario === undefined) {
      return [];
    }

    const componentIds = [...new Set([
      ...requirement.componentIds,
      ...receipt.componentIds,
    ])].sort();
    const subjectIds = [...new Set([
      ...requirement.subjectIds,
      ...receipt.subjectIds,
    ])].sort();
    const relatedDelivery = relatedCapabilityDelivery(
      scenario.label,
      subjectIds,
      componentIds,
      capabilityDelivery,
    );
    const classification = classifyGameplayIssue({
      gameplayStage: scenario.gameplayStage,
      scenarioLabel: scenario.label,
      componentIds,
      knowledgeDomain: requirement.domain,
    });

    const statusReason =
      receipt.status === "CAPABILITY_GAP"
        ? "No registered analysis capability can currently prove this required gameplay knowledge."
        : receipt.status === "BLOCKED_BY_PREREQUISITE"
          ? "The required gameplay proof is blocked by an unresolved prerequisite knowledge node."
          : "The required analysis capability exists, but it did not return sufficient scenario-scoped evidence.";

    return [{
      status: "NEED_VALIDATION" as const,
      issueType: issueTypeFor(
        scenario.label,
        subjectIds,
        componentIds,
        capabilityDelivery,
      ),
      failureDomain: classification.failureDomain,
      contributingDomains:
        classification.contributingDomains,
      gameplayFlow: classification.gameplayFlow,
      informationMismatch:
        relatedDelivery.some(
          (item) => item.informationMismatch,
        ),
      playerFacingEvidenceIds: [
        ...new Set(
          relatedDelivery.flatMap(
            (item) => item.playerFacingEvidenceIds,
          ),
        ),
      ].sort(),
      causalLinkId:
        "knowledge-gap:" + receipt.requirementId,
      scenarioId: scenario.id,
      gameplayStage: scenario.gameplayStage,
      scenarioLabel: scenario.label,
      gameplayTrigger: scenario.purpose,
      gameplayConsequence:
        "A required gameplay dependency remains materially unproven because its supporting knowledge could not be closed.",
      expectedOutcome:
        requirement.reason,
      actualOutcome:
        receipt.reason,
      affectedScope:
        [...new Set([
          ...subjectIds,
          ...componentIds,
        ])].sort().join(", "),
      subjectIds,
      componentIds,
      evidenceIds: [...new Set(receipt.evidenceIds)].sort(),
      knowledgeRequirementId:
        receipt.requirementId,
      validationReason: statusReason,
      missingProof:
        "Scenario-scoped " +
        requirement.domain +
        " evidence sufficient to decide the required gameplay dependency.",
      validationTest:
        "Exercise scenario '" +
        scenario.label +
        "' and directly verify the " +
        requirement.domain +
        " dependency: " +
        requirement.reason,
      validationGroupKey:
        scenario.id + ":" + requirement.domain,
    }];
  });
}

function syntheticNeedValidationFromShallowScenarios(
  graph: GameplayScenarioGraph,
  capabilityDelivery:
    readonly GameplayCapabilityDeliveryAssessment[],
): readonly NeedValidationAuditIssueProjection[] {
  return graph.scenarios.flatMap((scenario) => {
    if (
      scenario.composedScenarioIds.length > 0 ||
      scenario.componentIds.length === 0 ||
      scenario.causalLinkIds.length > 0
    ) {
      return [];
    }

    const componentIds = [...new Set(scenario.componentIds)].sort();
    const subjectIds = [...new Set(scenario.sourceSubjectIds)].sort();
    const relatedDelivery = relatedCapabilityDelivery(
      scenario.label,
      subjectIds,
      componentIds,
      capabilityDelivery,
    );
    const classification = classifyGameplayIssue({
      gameplayStage: scenario.gameplayStage,
      scenarioLabel: scenario.label,
      componentIds,
    });

    return [{
      status: "NEED_VALIDATION" as const,
      issueType: issueTypeFor(
        scenario.label,
        subjectIds,
        componentIds,
        capabilityDelivery,
      ),
      failureDomain: classification.failureDomain,
      contributingDomains:
        classification.contributingDomains,
      gameplayFlow: classification.gameplayFlow,
      informationMismatch:
        relatedDelivery.some(
          (item) => item.informationMismatch,
        ),
      playerFacingEvidenceIds: [
        ...new Set(
          relatedDelivery.flatMap(
            (item) => item.playerFacingEvidenceIds,
          ),
        ),
      ].sort(),
      causalLinkId:
        "shallow-scenario:" + scenario.id,
      scenarioId: scenario.id,
      gameplayStage: scenario.gameplayStage,
      scenarioLabel: scenario.label,
      gameplayTrigger: scenario.purpose,
      gameplayConsequence:
        "The gameplay scenario exists but has no causal proof edge, so a material failure could remain invisible to the audit.",
      expectedOutcome:
        "Every material leaf gameplay scenario has at least one causal dependency proof.",
      actualOutcome:
        "No causal proof edge was compiled for this scenario.",
      affectedScope:
        [...new Set([
          ...subjectIds,
          ...componentIds,
        ])].sort().join(", "),
      subjectIds,
      componentIds,
      evidenceIds: [],
      validationReason:
        "Scenario coverage is structurally too shallow to claim the behavior was actually tested.",
      missingProof:
        "At least one scenario-scoped causal dependency and its deciding evidence.",
      validationTest:
        "Run scenario '" +
        scenario.label +
        "' through its success and failure exit and verify that every required transition is causally accounted.",
      validationGroupKey:
        scenario.id + ":scenario-closure",
    }];
  });
}

function syntheticNeedValidationFromGraphStructure(
  graph: GameplayScenarioGraph,
): readonly NeedValidationAuditIssueProjection[] {
  const findings: NeedValidationAuditIssueProjection[] = [];

  for (const component of graph.components) {
    if (!component.orphan && component.gameplayPurpose.trim()) {
      continue;
    }
    const reason =
      component.orphan
        ? "Gameplay/technical component is not correlated to any material scenario."
        : "Gameplay/technical component has no grounded gameplay purpose.";
    findings.push({
      status: "NEED_VALIDATION",
      issueType: "BUG",
      failureDomain: "state-ownership",
      contributingDomains: ["state-ownership"],
      gameplayFlow: "ACTIVE_GAMEPLAY",
      informationMismatch: false,
      playerFacingEvidenceIds: [],
      causalLinkId:
        (component.orphan
          ? "orphan-component:"
          : "missing-purpose:") +
        component.id,
      scenarioId:
        "structure:" + component.id,
      gameplayStage: "ACTIVE_GAMEPLAY",
      scenarioLabel:
        component.orphan
          ? "orphan-component"
          : "missing-gameplay-purpose",
      gameplayTrigger:
        "Locate and exercise gameplay that depends on " +
        component.label +
        ".",
      gameplayConsequence:
        "The audit cannot prove how this component participates in gameplay, so a defect could remain outside scenario reasoning.",
      expectedOutcome:
        "Every material component has a gameplay purpose and at least one scenario correlation.",
      actualOutcome: reason,
      affectedScope: component.id,
      subjectIds: [component.id],
      componentIds: [component.id],
      evidenceIds: [...component.evidenceIds],
      validationReason: reason,
      missingProof:
        "A concrete gameplay purpose and scenario dependency for " +
        component.label +
        ".",
      validationTest:
        "Trace " +
        component.label +
        " from a player/system trigger through its observable gameplay effect and confirm which scenario owns it.",
      validationGroupKey:
        "component-coverage:" + component.id,
    });
  }

  const scenarioIds = new Set(
    graph.scenarios.map((scenario) => scenario.id),
  );
  for (const scenario of graph.scenarios) {
    const missingChildren =
      scenario.composedScenarioIds.filter(
        (id) => !scenarioIds.has(id),
      );
    if (missingChildren.length > 0) {
      findings.push({
        status: "NEED_VALIDATION",
        issueType: "BUG",
        failureDomain: "progression-wave-objective",
        contributingDomains: [
          "progression-wave-objective",
        ],
        gameplayFlow: "PROGRESSION",
        informationMismatch: false,
        playerFacingEvidenceIds: [],
        causalLinkId:
          "incomplete-composition:" + scenario.id,
        scenarioId: scenario.id,
        gameplayStage: scenario.gameplayStage,
        scenarioLabel: scenario.label,
        gameplayTrigger: scenario.purpose,
        gameplayConsequence:
          "The composed gameplay journey references missing child scenarios, so required flow can be omitted from proof.",
        expectedOutcome:
          "Every composed scenario references concrete existing child scenarios.",
        actualOutcome:
          "Missing child scenario(s): " +
          missingChildren.sort().join(", "),
        affectedScope: scenario.id,
        subjectIds: [...scenario.sourceSubjectIds],
        componentIds: [...scenario.componentIds],
        evidenceIds: [],
        validationReason:
          "Scenario composition is incomplete.",
        missingProof:
          "Concrete child scenario coverage for: " +
          missingChildren.sort().join(", "),
        validationTest:
          "Trace the composed gameplay flow for '" +
          scenario.label +
          "' and explicitly account for each missing child path.",
        validationGroupKey:
          "scenario-composition:" + scenario.id,
      });
    }

    if (
      scenario.composedScenarioIds.length === 0 &&
      scenario.componentIds.length === 0
    ) {
      findings.push({
        status: "NEED_VALIDATION",
        issueType: "BUG",
        failureDomain: "state-ownership",
        contributingDomains: ["state-ownership"],
        gameplayFlow: "ACTIVE_GAMEPLAY",
        informationMismatch: false,
        playerFacingEvidenceIds: [],
        causalLinkId:
          "scenario-without-components:" + scenario.id,
        scenarioId: scenario.id,
        gameplayStage: scenario.gameplayStage,
        scenarioLabel: scenario.label,
        gameplayTrigger: scenario.purpose,
        gameplayConsequence:
          "A gameplay scenario exists without concrete selected-artifact components, so its behavior cannot be grounded.",
        expectedOutcome:
          "Every material leaf scenario is bound to concrete selected-artifact components.",
        actualOutcome:
          "No concrete component binding exists.",
        affectedScope: scenario.id,
        subjectIds: [...scenario.sourceSubjectIds],
        componentIds: [],
        evidenceIds: [],
        validationReason:
          "Scenario lacks concrete component binding.",
        missingProof:
          "Selected-artifact component(s) that implement the scenario.",
        validationTest:
          "Trace scenario '" +
          scenario.label +
          "' to the scripts/functions/entities/state that actually implement it.",
        validationGroupKey:
          "scenario-components:" + scenario.id,
      });
    }
  }

  return sortIssues(findings);
}

export function projectAllNeedValidationAuditIssues(
  graph: GameplayScenarioGraph,
  gate: GameplayDefectResolutionGate,
  capabilityDelivery:
    readonly GameplayCapabilityDeliveryAssessment[] = [],
): readonly NeedValidationAuditIssueProjection[] {
  const items = [
    ...projectNeedValidationAuditIssues(
      graph,
      gate,
      capabilityDelivery,
    ),
    ...syntheticNeedValidationFromKnowledge(
      graph,
      capabilityDelivery,
    ),
    ...syntheticNeedValidationFromShallowScenarios(
      graph,
      capabilityDelivery,
    ),
    ...syntheticNeedValidationFromGraphStructure(
      graph,
    ),
  ];

  const byId = new Map<string, NeedValidationAuditIssueProjection>();
  for (const item of items) {
    if (!byId.has(item.causalLinkId)) {
      byId.set(item.causalLinkId, item);
    }
  }
  return sortIssues([...byId.values()]);
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
