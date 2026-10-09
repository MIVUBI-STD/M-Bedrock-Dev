import type {
  GameplayIntentModel,
} from "../../../gameplay-intent/src/index.js";
import type {
  GameplayWorldModel,
} from "../gameplay-world-model.js";
import type {
  SemanticGraph,
} from "../../../graph/src/index.js";
import type {
  PatchTransaction,
} from "../../../repair/src/index.js";
import type {
  ValidationScenario,
} from "../../../validation/src/index.js";
import {
  compileContextPack,
  type CompiledContextPack,
  type ContextCompilerBudget,
} from "./context-compiler.js";
import {
  planPatchSemanticAffectedSet,
  type SemanticAffectedPlan,
} from "./semantic-affected-plan.js";
import type {
  RuntimeEvidenceRecord,
  RuntimeScope,
  SemanticProofClaim,
} from "../../../project-model/src/index.js";
import {
  assessSemanticProofReuse,
  type SemanticProofReuseResult,
} from "./semantic-proof-cache.js";
import {
  planSelectiveValidation,
  type SelectiveValidationPlan,
  type ValidationScenarioImpactBinding,
} from "./selective-validation-plan.js";

export interface ZeroWasteWorkflowProofInput {
  claim: SemanticProofClaim;
  claimRevision: string;
  availableEvidenceIds:
    readonly string[];
  targetProfileFingerprint?: string;
  runtimeScope?: RuntimeScope;
  staleEvidenceIds?: readonly string[];
  runtimeEvidenceRecords?: readonly RuntimeEvidenceRecord[];
  dependsOnClaimIds?: readonly string[];
}

export interface ZeroWasteWorkflowInput {
  goal: string;
  graph: SemanticGraph;
  postPatchGraph?: SemanticGraph;
  intent: GameplayIntentModel;
  worldModel?: GameplayWorldModel;
  transaction: PatchTransaction;
  validationScenarios:
    readonly ValidationScenario[];
  validationBindings:
    readonly ValidationScenarioImpactBinding[];
  proofClaims?:
    readonly ZeroWasteWorkflowProofInput[];
  relevantSemanticNodeIds?:
    readonly string[];
  relevantIntentSubjectIds?:
    readonly string[];
  relevantInvariantIds?:
    readonly string[];
  relevantEvidenceIds?:
    readonly string[];
  contextBudget?:
    Partial<ContextCompilerBudget>;
}

export type ZeroWasteProofActionKind =
  | "reuse"
  | "recompute"
  | "restore-evidence";

export interface ZeroWasteProofAction {
  claimId: string;
  action: ZeroWasteProofActionKind;
  dependsOnClaimIds: readonly string[];
  reasons: readonly string[];
}

export interface ZeroWasteWorkflowPlan {
  transactionId: string;
  impactAuthority:
    | "post-patch"
    | "pre-patch-conservative";
  status:
    | "ready"
    | "needs-context-expansion"
    | "blocked";
  affected:
    SemanticAffectedPlan;
  context:
    CompiledContextPack;
  validation:
    SelectiveValidationPlan;
  proofReuse:
    readonly SemanticProofReuseResult[];
  reusableProofClaimIds:
    readonly string[];
  staleProofClaimIds:
    readonly string[];
  blockedProofClaimIds:
    readonly string[];
  proofActions:
    readonly ZeroWasteProofAction[];
  reasons: readonly string[];
}

export function prepareZeroWasteWorkflow(
  input: ZeroWasteWorkflowInput,
): ZeroWasteWorkflowPlan {
  if (!input.goal.trim()) {
    throw new Error(
      "Zero-waste workflow goal must be non-empty.",
    );
  }

  const impactAuthority =
    input.postPatchGraph === undefined
      ? "pre-patch-conservative" as const
      : "post-patch" as const;
  const effectiveGraph =
    input.postPatchGraph ??
    input.graph;
  const affected =
    planPatchSemanticAffectedSet(
      effectiveGraph,
      input.transaction,
    );

  const requiredSemanticNodeIds =
    affected.status === "planned"
      ? [
          ...new Set([
            ...affected.changedNodeIds,
            ...(input.relevantSemanticNodeIds ??
              []),
          ]),
        ].sort()
      : [
          ...new Set(
            input.relevantSemanticNodeIds ??
            [],
          ),
        ].sort();

  const context =
    compileContextPack({
      goal: input.goal,
      graph: effectiveGraph,
      intent: input.intent,
      ...(input.worldModel === undefined
        ? {}
        : { worldModel: input.worldModel }),
      ...(affected.status === "planned"
        ? { affected }
        : {}),
      ...(requiredSemanticNodeIds.length === 0
        ? {}
        : {
            relevantSemanticNodeIds:
              requiredSemanticNodeIds,
          }),
      ...(input
        .relevantIntentSubjectIds ===
      undefined
        ? {}
        : {
            relevantIntentSubjectIds:
              input
                .relevantIntentSubjectIds,
          }),
      ...(input
        .relevantInvariantIds ===
      undefined
        ? {}
        : {
            relevantInvariantIds:
              input
                .relevantInvariantIds,
          }),
      ...(input
        .relevantEvidenceIds ===
      undefined
        ? {}
        : {
            relevantEvidenceIds:
              input
                .relevantEvidenceIds,
          }),
      ...(input.contextBudget ===
      undefined
        ? {}
        : {
            budget:
              input.contextBudget,
          }),
    });

  const validation =
    planSelectiveValidation(
      input.validationScenarios,
      impactAuthority === "post-patch"
        ? input.validationBindings
        : [],
      affected,
    );

  const proofReuse =
    (input.proofClaims ?? [])
      .map((item) =>
        impactAuthority ===
        "post-patch"
          ? assessSemanticProofReuse(
              item.claim,
              {
                graph:
                  effectiveGraph,
                claimRevision:
                  item.claimRevision,
                availableEvidenceIds:
                  item.availableEvidenceIds,
                ...(item
                  .targetProfileFingerprint ===
                undefined
                  ? {}
                  : {
                      targetProfileFingerprint:
                        item
                          .targetProfileFingerprint,
                    }),
                ...(item.runtimeScope === undefined
                  ? {}
                  : {
                      runtimeScope:
                        item.runtimeScope,
                    }),
                ...(item.staleEvidenceIds === undefined
                  ? {}
                  : {
                      staleEvidenceIds:
                        item.staleEvidenceIds,
                    }),
                ...(item.runtimeEvidenceRecords === undefined
                  ? {}
                  : {
                      runtimeEvidenceRecords:
                        item.runtimeEvidenceRecords,
                    }),
              },
            )
          : {
              status:
                "blocked" as const,
              claimId:
                item.claim.claimId,
              reasons: [
                "Post-patch semantic graph is required before prior proof can be reused across a mutation.",
              ],
            },
      )
      .sort((a, b) =>
        a.claimId.localeCompare(
          b.claimId,
        ),
      );

  const reusableProofClaimIds =
    proofReuse
      .filter(
        (item) =>
          item.status ===
          "reusable",
      )
      .map(
        (item) =>
          item.claimId,
      );
  const staleProofClaimIds =
    proofReuse
      .filter(
        (item) =>
          item.status ===
          "stale",
      )
      .map(
        (item) =>
          item.claimId,
      );
  const blockedProofClaimIds =
    proofReuse
      .filter(
        (item) =>
          item.status ===
          "blocked",
      )
      .map(
        (item) =>
          item.claimId,
      );

  const proofInputByClaim = new Map(
    (input.proofClaims ?? []).map((item) => [
      item.claim.claimId,
      item,
    ]),
  );

  const actionByClaim = new Map(
    proofReuse.map((item) => [
      item.claimId,
      {
        claimId: item.claimId,
        action:
          item.status === "reusable"
            ? "reuse" as const
            : item.status === "stale"
              ? "recompute" as const
              : "restore-evidence" as const,
        dependsOnClaimIds: [
          ...new Set(
            proofInputByClaim
              .get(item.claimId)
              ?.dependsOnClaimIds ?? [],
          ),
        ].sort(),
        reasons: [...item.reasons],
      },
    ]),
  );

  const proofActionErrors: string[] = [];
  for (const action of actionByClaim.values()) {
    for (const dependencyId of action.dependsOnClaimIds) {
      if (!actionByClaim.has(dependencyId)) {
        proofActionErrors.push(
          "Proof action " +
            action.claimId +
            " depends on unknown claim " +
            dependencyId +
            ".",
        );
      }
    }
  }

  const proofActions: ZeroWasteProofAction[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visitProofAction = (claimId: string): void => {
    if (visited.has(claimId)) return;
    if (visiting.has(claimId)) {
      proofActionErrors.push(
        "Proof action dependency cycle detected at " +
          claimId +
          ".",
      );
      return;
    }

    const action = actionByClaim.get(claimId);
    if (!action) return;

    visiting.add(claimId);
    for (const dependencyId of action.dependsOnClaimIds) {
      visitProofAction(dependencyId);
    }
    visiting.delete(claimId);

    if (!visited.has(claimId)) {
      visited.add(claimId);
      proofActions.push(action);
    }
  };

  for (const claimId of [...actionByClaim.keys()].sort()) {
    visitProofAction(claimId);
  }

  const blocked =
    affected.status ===
      "blocked" ||
    validation.status ===
      "blocked" ||
    proofActionErrors.length > 0;
  const needsContextExpansion =
    !blocked &&
    context.complete === false;

  return {
    transactionId:
      input.transaction.id,
    impactAuthority,
    status:
      blocked
        ? "blocked"
        : needsContextExpansion
          ? "needs-context-expansion"
          : "ready",
    affected,
    context,
    validation,
    proofReuse,
    reusableProofClaimIds,
    staleProofClaimIds,
    blockedProofClaimIds,
    proofActions,
    reasons: [
      impactAuthority === "post-patch"
        ? "Affected closure, selective validation, and proof reuse are bound to the post-patch semantic graph."
        : "Post-patch semantic graph is unavailable; validation remains conservative and prior proof reuse is blocked.",
      affected.status ===
      "planned"
        ? String(
            affected
              .affectedNodeCount,
          ) +
          " semantic node(s) require downstream consideration; " +
          String(
            affected
              .skippedNodeCount,
          ) +
          " are outside the affected closure."
        : "Semantic affected planning is blocked, so no selective skip is authoritative.",
      validation.status ===
      "planned"
        ? String(
            validation
              .selectedScenarioCount,
          ) +
          " validation scenario(s) selected and " +
          String(
            validation
              .skippedScenarioCount,
          ) +
          " safely skipped."
        : "Selective validation is blocked and must fall back to the conservative validation path.",
      reusableProofClaimIds.length >
      0
        ? String(
            reusableProofClaimIds
              .length,
          ) +
          " proof claim(s) remain reusable."
        : "No prior proof claim was reusable for this workflow input.",
      context.complete
        ? "Compiled AI context is complete; changed semantic nodes are always retained as required scope."
        : "Compiled AI context is incomplete; expand the context or resolve missing requested ids before using it as decision authority.",
      ...(proofActionErrors.length === 0
        ? []
        : [
            "Proof dependency routing is blocked: " +
              proofActionErrors.join(" "),
          ]),
      staleProofClaimIds.length >
      0
        ? String(
            staleProofClaimIds
              .length,
          ) +
          " proof claim(s) became stale and require re-proof."
        : "No proof claim became stale.",
    ],
  };
}

export function zeroWasteWorkflowPlanText(
  plan: ZeroWasteWorkflowPlan,
): string {
  const lines = [
    "Zero-Waste Workflow Plan",
    "Status: " + plan.status,
    "Impact authority: " +
      plan.impactAuthority,
    "",
    "Impact",
    "- changed: " +
      String(
        plan.affected
          .changedNodeCount,
      ),
    "- affected: " +
      String(
        plan.affected
          .affectedNodeCount,
      ),
    "- skipped nodes: " +
      String(
        plan.affected
          .skippedNodeCount,
      ),
    "",
    "Validation",
    "- selected: " +
      String(
        plan.validation
          .selectedScenarioCount,
      ),
    "- skipped: " +
      String(
        plan.validation
          .skippedScenarioCount,
      ),
    "",
    "Proofs",
    "- reusable: " +
      String(
        plan
          .reusableProofClaimIds
          .length,
      ),
    "- stale: " +
      String(
        plan
          .staleProofClaimIds
          .length,
      ),
    "- blocked: " +
      String(
        plan
          .blockedProofClaimIds
          .length,
      ),
    "- reuse actions: " +
      String(
        plan.proofActions.filter(
          (item) => item.action === "reuse",
        ).length,
      ),
    "- recompute actions: " +
      String(
        plan.proofActions.filter(
          (item) => item.action === "recompute",
        ).length,
      ),
    "- restore-evidence actions: " +
      String(
        plan.proofActions.filter(
          (item) => item.action === "restore-evidence",
        ).length,
      ),
    "",
    "Context",
    "- semantic nodes: " +
      String(
        plan.context.semantic
          .nodes.length,
      ),
    "- intent nodes: " +
      String(
        plan.context.intent
          .nodes.length,
      ),
    "- evidence: " +
      String(
        plan.context.intent
          .evidence.length,
      ),
  ];

  lines.push("", "Why");
  for (const reason of plan.reasons) {
    lines.push("- " + reason);
  }

  return lines.join("\n") + "\n";
}
