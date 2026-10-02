import type {
  GameplayIntentModel,
} from "../../gameplay-intent/src/index.js";
import type {
  MandatoryAuditProcedureReceipt,
} from "./inspection/mandatory-audit-procedure.js";
import type {
  GameplayScenarioGraph,
} from "./inspection/gameplay-scenario-model.js";
import type {
  GameplayDefectResolutionGate,
} from "./inspection/gameplay-defect-resolution.js";
import type {
  SelectedMapAuditAdmission,
  SelectedMapAuditStage,
} from "./map-audit-admission.js";

export type AuditModelTaskKind =
  | "CHECKPOINT_REASONING"
  | "GAMEPLAY_TRANSLATION"
  | "COUNTERPROOF_SEARCH";

export interface AuditModelTaskPacket {
  readonly schemaVersion: 1;
  readonly policy: "bounded-audit-model-task";
  readonly id: string;
  readonly kind: AuditModelTaskKind;
  readonly stage: SelectedMapAuditStage;
  readonly goal: string;
  readonly decisionNeeded: string;
  readonly scenarioId?: string;
  readonly causalLinkId?: string;
  readonly checkpointId?: string;
  readonly subjectIds: readonly string[];
  readonly componentIds: readonly string[];
  readonly requiredKnowledgeIds: readonly string[];
  readonly evidenceIds: readonly string[];
  readonly unresolvedObligationIds: readonly string[];
  readonly allowedOutputs: readonly string[];
  readonly forbiddenActions: readonly string[];
  readonly stopCondition: string;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(
    values.filter((value) => value.trim().length > 0),
  )].sort();
}

function checkpointPackets(
  stage: SelectedMapAuditStage,
  procedure: MandatoryAuditProcedureReceipt,
): readonly AuditModelTaskPacket[] {
  return procedure.checkpoints
    .filter((checkpoint) =>
      checkpoint.blocksPublication &&
      (
        (stage === "TARGET" && checkpoint.id === "A1") ||
        (stage === "DISCOVERY" && checkpoint.id === "A2") ||
        (stage === "UNDERSTAND" && checkpoint.id.startsWith("A") && checkpoint.id !== "A1" && checkpoint.id !== "A2") ||
        (stage === "MODEL" && checkpoint.id.startsWith("B")) ||
        (stage === "STRESS" && checkpoint.id.startsWith("C")) ||
        (stage === "REPORT" && checkpoint.id.startsWith("E"))
      )
    )
    .map((checkpoint) => {
      const unresolved = checkpoint.obligations
        .filter((item) => item.required && !item.satisfied)
        .map((item) => item.id)
        .sort();
      return {
        schemaVersion: 1 as const,
        policy: "bounded-audit-model-task" as const,
        id: "task:checkpoint:" + checkpoint.id,
        kind: "CHECKPOINT_REASONING" as const,
        stage,
        goal:
          "Resolve only the blocking audit checkpoint " +
          checkpoint.id +
          " (" + checkpoint.label + ").",
        decisionNeeded:
          checkpoint.reason,
        checkpointId: checkpoint.id,
        subjectIds: [],
        componentIds: [],
        requiredKnowledgeIds: [],
        evidenceIds: unique([
          ...checkpoint.evidenceIds,
          ...checkpoint.obligations.flatMap((item) => item.evidenceIds),
        ]),
        unresolvedObligationIds: unresolved,
        allowedOutputs: [
          "grounded checkpoint conclusion",
          "missing evidence request",
          "detection gap",
        ],
        forbiddenActions: [
          "create or rank bug report items",
          "inspect unrelated gameplay systems",
          "infer intent from external/stale documents",
          "change audit stage",
        ],
        stopCondition:
          "Stop when every required obligation for this checkpoint is either satisfied by selected-artifact evidence or explicitly classified as a blocking gap.",
      };
    });
}

function provePackets(
  graph: GameplayScenarioGraph,
  gate: GameplayDefectResolutionGate,
): readonly AuditModelTaskPacket[] {
  const ids = new Set([
    ...gate.gameplayTranslationRequiredIds,
    ...gate.counterProofSearchRequiredIds,
  ]);

  return graph.causalLinks
    .filter((link) => ids.has(link.id))
    .map((link) => {
      const scenario = graph.scenarios.find(
        (item) => item.id === link.scenarioId,
      );
      const requirement = link.knowledgeRequirementId === undefined
        ? undefined
        : graph.knowledgeRequirements.find(
            (item) => item.id === link.knowledgeRequirementId,
          );
      const needsTranslation =
        gate.gameplayTranslationRequiredIds.includes(link.id);
      return {
        schemaVersion: 1 as const,
        policy: "bounded-audit-model-task" as const,
        id:
          "task:" +
          (needsTranslation ? "translate:" : "counterproof:") +
          link.id,
        kind:
          needsTranslation
            ? "GAMEPLAY_TRANSLATION" as const
            : "COUNTERPROOF_SEARCH" as const,
        stage: "PROVE" as const,
        goal:
          needsTranslation
            ? "Translate the contradicted technical dependency into one concrete gameplay failure."
            : "Search only for deterministic blocking counter-proof for this contradicted gameplay dependency.",
        decisionNeeded:
          needsTranslation
            ? "Determine trigger, expected outcome, actual outcome, player-visible consequence, and affected scope."
            : "Determine whether a reachable guard/owner/generation/scope/cleanup/exclusion makes the wrong state unreachable before commit.",
        scenarioId: link.scenarioId,
        causalLinkId: link.id,
        subjectIds: unique(link.subjectIds),
        componentIds: unique(link.componentIds),
        requiredKnowledgeIds:
          requirement === undefined ? [] : [requirement.id],
        evidenceIds: unique([
          ...link.evidenceIds,
          ...(requirement === undefined ? [] : graph.knowledgeReceipts
            .filter((receipt) =>
              receipt.requirementId === requirement.id
            )
            .flatMap((receipt) => receipt.evidenceIds)),
        ]),
        unresolvedObligationIds: [],
        allowedOutputs:
          needsTranslation
            ? [
                "gameplay translation",
                "detection gap",
              ]
            : [
                "blocking counter-proof with evidence + CounterProofSearchReceipt",
                "counter-proof search exhausted within supplied scope + CounterProofSearchReceipt",
                "runtime proof required",
                "detection gap",
              ],
        forbiddenActions: [
          "inspect unrelated scenarios",
          "invent expected behavior not grounded in the selected artifact",
          "use nearby healthy code as counter-proof",
          "create final report text",
          "change severity",
        ],
        stopCondition:
          needsTranslation
            ? "Stop after one complete gameplay-causal translation or one explicit evidence gap."
            : "Stop only after returning a CounterProofSearchReceipt bound to this causal link scope. Exhaustion requires explicit searched dimensions, coverage evidence, exhaustiveWithinScope=true, and NO_BLOCKING_PROOF; a blocker requires BLOCKING_PROOF_FOUND.",
      };
    });
}

export function deriveAuditModelTaskPackets(input: {
  readonly admission: SelectedMapAuditAdmission;
  readonly procedure: MandatoryAuditProcedureReceipt;
  readonly graph: GameplayScenarioGraph;
  readonly defectResolution: GameplayDefectResolutionGate;
  readonly intent: GameplayIntentModel;
}): readonly AuditModelTaskPacket[] {
  const stage = input.admission.firstBlockingStage;
  if (stage === undefined) return [];

  if (stage === "PROVE") {
    const prove = provePackets(
      input.graph,
      input.defectResolution,
    );
    if (prove.length > 0) return prove;
  }

  return checkpointPackets(stage, input.procedure);
}
