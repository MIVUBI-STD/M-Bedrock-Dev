import type {
  GameplayIntentModel,
} from "../../gameplay-intent/src/index.js";
import type {
  SemanticGraph,
} from "../../graph/src/index.js";
import type {
  PatchTransaction,
} from "../../repair/src/index.js";
import type {
  ValidationScenario,
} from "../../validation/src/index.js";
import {
  compileContextPack,
  type CompiledContextPack,
  type ContextCompilerBudget,
} from "./context-compiler.js";
import {
  planPatchSemanticAffectedSet,
  type SemanticAffectedPlan,
} from "./semantic-affected-plan.js";
import {
  assessSemanticProofReuse,
  type SemanticProofClaim,
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
  targetProfileFingerprint?: string;
}

export interface ZeroWasteWorkflowInput {
  goal: string;
  graph: SemanticGraph;
  intent: GameplayIntentModel;
  transaction: PatchTransaction;
  validationScenarios:
    readonly ValidationScenario[];
  validationBindings:
    readonly ValidationScenarioImpactBinding[];
  proofClaims?:
    readonly ZeroWasteWorkflowProofInput[];
  relevantIntentSubjectIds?:
    readonly string[];
  relevantInvariantIds?:
    readonly string[];
  relevantEvidenceIds?:
    readonly string[];
  contextBudget?:
    Partial<ContextCompilerBudget>;
}

export interface ZeroWasteWorkflowPlan {
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

  const affected =
    planPatchSemanticAffectedSet(
      input.graph,
      input.transaction,
    );

  const context =
    compileContextPack({
      goal: input.goal,
      graph: input.graph,
      intent: input.intent,
      ...(affected.status === "planned"
        ? { affected }
        : {}),
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
      input.validationBindings,
      affected,
    );

  const proofReuse =
    (input.proofClaims ?? [])
      .map((item) =>
        assessSemanticProofReuse(
          item.claim,
          {
            graph: input.graph,
            claimRevision:
              item.claimRevision,
            ...(item
              .targetProfileFingerprint ===
            undefined
              ? {}
              : {
                  targetProfileFingerprint:
                    item
                      .targetProfileFingerprint,
                }),
          },
        ),
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

  const blocked =
    affected.status ===
      "blocked" ||
    validation.status ===
      "blocked";
  const needsContextExpansion =
    !blocked &&
    context.complete === false;

  return {
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
    reasons: [
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
        ? "Compiled AI context is complete for its explicit scope."
        : "Compiled AI context is incomplete; expand the context or resolve missing requested ids before using it as decision authority.",
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
