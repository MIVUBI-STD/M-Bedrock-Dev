import type {
  ResolvedGameDesignIntentRule,
} from "../../game-design-spec/src/index.js";
import {
  assessGameplayIntentGrounding,
  independentGameplayIntentEvidenceIds,
  type GameplayIntentModel,
} from "../../gameplay-intent/src/index.js";

export type IntentDiagnosticDisposition =
  | "confirmed-defect"
  | "designed-behavior"
  | "design-review"
  | "engine-constraint"
  | "compatibility-difference"
  | "insufficient-evidence"
  | "ambiguous-intent"
  | "runtime-proof-required";

export type IntentDiagnosticNextEvidenceNeed =
  | "none"
  | "intent-grounding"
  | "intent-clarification"
  | "authored-intent"
  | "contradiction-proof"
  | "runtime-proof"
  | "runtime-evidence-integrity";

export type GameDesignObservationRelation =
  | "supports-observed"
  | "contradicts-observed"
  | "unclear";

export type IntentConcernKind =
  | "implementation"
  | "balance"
  | "ux"
  | "content"
  | "compatibility";

export interface IntentDiagnosticGateInput {
  intent: GameplayIntentModel;
  resolvedGameDesignRule?: ResolvedGameDesignIntentRule;
  gameDesignObservationRelation?: GameDesignObservationRelation;
  concernKind?: IntentConcernKind;
  subjectIds: readonly string[];
  observationEvidenceIds: readonly string[];
  contradictionEvidenceIds?: readonly string[];
  designMatchEvidenceIds?: readonly string[];
  engineConstraintEvidenceIds?: readonly string[];
  compatibilityDifferenceEvidenceIds?: readonly string[];
  runtimeProofRequired?: boolean;
  runtimeProofEvidenceIds?: readonly string[];
  runtimeEvidenceIntegritySatisfied?: boolean;
}

export interface IntentDiagnosticGateResult {
  disposition: IntentDiagnosticDisposition;
  subjectIds: readonly string[];
  basisInvariantIds: readonly string[];
  basisDesignRuleIds?: readonly string[];
  basisDesignEvidenceIds?: readonly string[];
  evidenceIds: readonly string[];
  nextEvidenceNeed: IntentDiagnosticNextEvidenceNeed;
  reasons: readonly string[];
}

export function gateIntentDiagnostic(
  input: IntentDiagnosticGateInput,
): IntentDiagnosticGateResult {
  const resolvedRule = input.resolvedGameDesignRule;
  if (resolvedRule) {
    const rule = resolvedRule.rule;
    const designEvidenceIds = [
      "game-design:" + resolvedRule.designId + ":rule:" + rule.id,
      "game-design-source:" + resolvedRule.sourceReference,
    ];

    if (resolvedRule.exceptionId) {
      return {
        disposition: "designed-behavior",
        subjectIds: [...input.subjectIds],
        basisInvariantIds: [],
        basisDesignRuleIds: [rule.id],
        basisDesignEvidenceIds: designEvidenceIds,
        evidenceIds: [
          ...input.observationEvidenceIds,
          ...designEvidenceIds,
        ],
        nextEvidenceNeed: "none",
        reasons: [
          "An explicit Game Design exception applies: " +
            resolvedRule.exceptionId +
            ".",
        ],
      };
    }

    if (
      rule.outcome === "unspecified" ||
      input.gameDesignObservationRelation === "unclear" ||
      input.gameDesignObservationRelation === undefined
    ) {
      return {
        disposition: "ambiguous-intent",
        subjectIds: [...input.subjectIds],
        basisInvariantIds: [],
        basisDesignRuleIds: [rule.id],
        basisDesignEvidenceIds: designEvidenceIds,
        evidenceIds: [
          ...input.observationEvidenceIds,
          ...designEvidenceIds,
        ],
        nextEvidenceNeed: "intent-clarification",
        reasons: [
          "The applicable Game Design rule does not establish a decisive expected outcome for this observation.",
        ],
      };
    }

    if (input.gameDesignObservationRelation === "supports-observed") {
      const reviewConcern =
        input.concernKind === "balance" ||
        input.concernKind === "ux";
      return {
        disposition: reviewConcern
          ? "design-review"
          : "designed-behavior",
        subjectIds: [...input.subjectIds],
        basisInvariantIds: [],
        basisDesignRuleIds: [rule.id],
        basisDesignEvidenceIds: designEvidenceIds,
        evidenceIds: [
          ...input.observationEvidenceIds,
          ...designEvidenceIds,
        ],
        nextEvidenceNeed: "none",
        reasons: [
          reviewConcern
            ? "Observed behavior matches approved Game Design; the concern belongs to design/UX review rather than implementation correctness."
            : "Observed behavior matches the applicable Game Design rule.",
        ],
      };
    }

    const contradictionEvidence =
      input.contradictionEvidenceIds ?? [];
    if (
      input.observationEvidenceIds.length > 0 &&
      contradictionEvidence.length > 0 &&
      resolvedRule.authority === "authoritative"
    ) {
      if (
        input.runtimeProofRequired === true &&
        (input.runtimeProofEvidenceIds?.length ?? 0) === 0
      ) {
        return {
          disposition: "runtime-proof-required",
          subjectIds: [...input.subjectIds],
          basisInvariantIds: [],
          basisDesignRuleIds: [rule.id],
          basisDesignEvidenceIds: designEvidenceIds,
          evidenceIds: [
            ...input.observationEvidenceIds,
            ...designEvidenceIds,
          ],
          nextEvidenceNeed: "runtime-proof",
          reasons: [
            "Game Design contradiction is plausible, but this behavior requires runtime proof before defect confirmation.",
          ],
        };
      }

      return {
        disposition: "confirmed-defect",
        subjectIds: [...input.subjectIds],
        basisInvariantIds: [],
        basisDesignRuleIds: [rule.id],
        basisDesignEvidenceIds: designEvidenceIds,
        evidenceIds: [
          ...input.observationEvidenceIds,
          ...contradictionEvidence,
          ...(input.runtimeProofEvidenceIds ?? []),
          ...designEvidenceIds,
        ],
        nextEvidenceNeed: "none",
        reasons: [
          "Observed evidence contradicts an authoritative approved Game Design rule.",
        ],
      };
    }

    if (input.gameDesignObservationRelation === "contradicts-observed") {
      if (
        resolvedRule.authority === "strong"
      ) {
        return {
          disposition: "ambiguous-intent",
          subjectIds: [...input.subjectIds],
          basisInvariantIds: [],
          basisDesignRuleIds: [rule.id],
          basisDesignEvidenceIds: designEvidenceIds,
          evidenceIds: [
            ...input.observationEvidenceIds,
            ...contradictionEvidence,
            ...designEvidenceIds,
          ],
          nextEvidenceNeed: "authored-intent",
          reasons: [
            "Approved reconstruction is useful intent evidence but is not independent authored/client authority for confirming a gameplay defect.",
          ],
        };
      }

      if (
        resolvedRule.authority === "unknown" ||
        resolvedRule.authority === "inferred"
      ) {
        return {
          disposition: "ambiguous-intent",
          subjectIds: [...input.subjectIds],
          basisInvariantIds: [],
          basisDesignRuleIds: [rule.id],
          basisDesignEvidenceIds: designEvidenceIds,
          evidenceIds: [
            ...input.observationEvidenceIds,
            ...designEvidenceIds,
          ],
          nextEvidenceNeed: "intent-clarification",
          reasons: [
            "Applicable Game Design intent is not authoritative enough to classify the contradiction as a defect.",
          ],
        };
      }

      return {
        disposition: "insufficient-evidence",
        subjectIds: [...input.subjectIds],
        basisInvariantIds: [],
        basisDesignRuleIds: [rule.id],
        basisDesignEvidenceIds: designEvidenceIds,
        evidenceIds: [
          ...input.observationEvidenceIds,
          ...designEvidenceIds,
        ],
        nextEvidenceNeed: "contradiction-proof",
        reasons: [
          "Applicable Game Design rule exists, but contradiction evidence is not sufficient for defect classification.",
        ],
      };
    }
  }

  const grounding = assessGameplayIntentGrounding(
    input.intent,
    input.subjectIds,
  );

  if (grounding.disposition === "insufficient") {
    return {
      disposition: "insufficient-evidence",
      subjectIds: [...input.subjectIds],
      basisInvariantIds: [],
      basisDesignRuleIds: [],
      basisDesignEvidenceIds: [],
      evidenceIds: [...input.observationEvidenceIds],
      nextEvidenceNeed: "intent-grounding",
      reasons: grounding.reasons,
    };
  }

  if (grounding.disposition === "ambiguous") {
    return {
      disposition: "ambiguous-intent",
      subjectIds: [...input.subjectIds],
      basisInvariantIds: [],
      basisDesignRuleIds: [],
      basisDesignEvidenceIds: [],
      evidenceIds: [...input.observationEvidenceIds],
      nextEvidenceNeed: "intent-clarification",
      reasons: grounding.reasons,
    };
  }

  if (
    (input.compatibilityDifferenceEvidenceIds?.length ?? 0) > 0
  ) {
    return {
      disposition: "compatibility-difference",
      subjectIds: [...input.subjectIds],
      basisInvariantIds: [],
      basisDesignRuleIds: [],
      basisDesignEvidenceIds: [],
      evidenceIds: [
        ...input.observationEvidenceIds,
        ...(input.compatibilityDifferenceEvidenceIds ?? []),
      ],
      nextEvidenceNeed: "none",
      reasons: [
        "Observed behavior is explained by an evidenced target compatibility difference.",
      ],
    };
  }

  if ((input.engineConstraintEvidenceIds?.length ?? 0) > 0) {
    return {
      disposition: "engine-constraint",
      subjectIds: [...input.subjectIds],
      basisInvariantIds: [],
      basisDesignRuleIds: [],
      basisDesignEvidenceIds: [],
      evidenceIds: [
        ...input.observationEvidenceIds,
        ...(input.engineConstraintEvidenceIds ?? []),
      ],
      nextEvidenceNeed: "none",
      reasons: [
        "Observed behavior is explained by an evidenced engine constraint.",
      ],
    };
  }

  if ((input.designMatchEvidenceIds?.length ?? 0) > 0) {
    return {
      disposition: "designed-behavior",
      subjectIds: [...input.subjectIds],
      basisInvariantIds: [],
      basisDesignRuleIds: [],
      basisDesignEvidenceIds: [],
      evidenceIds: [
        ...input.observationEvidenceIds,
        ...(input.designMatchEvidenceIds ?? []),
      ],
      nextEvidenceNeed: "none",
      reasons: [
        "Observed behavior has direct evidence matching the authored or inferred design.",
      ],
    };
  }

  if (
    input.runtimeProofRequired === true &&
    (input.runtimeProofEvidenceIds?.length ?? 0) === 0
  ) {
    return {
      disposition: "runtime-proof-required",
      subjectIds: [...input.subjectIds],
      basisInvariantIds: [],
      basisDesignRuleIds: [],
      basisDesignEvidenceIds: [],
      evidenceIds: [...input.observationEvidenceIds],
      nextEvidenceNeed: "runtime-proof",
      reasons: [
        "This behavior depends on runtime semantics that static evidence cannot prove.",
      ],
    };
  }

  if (
    input.runtimeProofRequired === true &&
    (input.runtimeProofEvidenceIds?.length ?? 0) > 0 &&
    input.runtimeEvidenceIntegritySatisfied === false
  ) {
    return {
      disposition: "runtime-proof-required",
      subjectIds: [...input.subjectIds],
      basisInvariantIds: [],
      basisDesignRuleIds: [],
      basisDesignEvidenceIds: [],
      evidenceIds: [
        ...input.observationEvidenceIds,
        ...(input.runtimeProofEvidenceIds ?? []),
      ],
      nextEvidenceNeed: "runtime-evidence-integrity",
      reasons: [
        "Runtime proof evidence exists, but its integrity is not sufficient for defect confirmation.",
      ],
    };
  }

  const applicable = input.intent.invariants.filter((invariant) =>
    invariant.subjectIds.some((subjectId) =>
      input.subjectIds.includes(subjectId),
    ),
  );

  const authored = applicable.filter(
    (invariant) => invariant.status === "authored",
  );
  const independentEvidenceIds =
    new Set(
      independentGameplayIntentEvidenceIds(
        input.intent,
        authored.map((invariant) => invariant.id),
      ),
    );
  const authoritativeAuthored = authored.filter(
    (invariant) =>
      invariant.evidenceIds.some((id) =>
        independentEvidenceIds.has(id)
      ),
  );
  const implementationOnlyAuthored = authored.filter(
    (invariant) =>
      !invariant.evidenceIds.some((id) =>
        independentEvidenceIds.has(id)
      ),
  );
  const inferred = applicable.filter(
    (invariant) => invariant.status === "inferred",
  );

  if (
    input.observationEvidenceIds.length > 0 &&
    (input.contradictionEvidenceIds?.length ?? 0) > 0 &&
    authoritativeAuthored.length > 0
  ) {
    return {
      disposition: "confirmed-defect",
      subjectIds: [...input.subjectIds],
      basisInvariantIds: authoritativeAuthored.map((item) => item.id),
      basisDesignRuleIds: [],
      basisDesignEvidenceIds: [],
      evidenceIds: [
        ...input.observationEvidenceIds,
        ...(input.contradictionEvidenceIds ?? []),
        ...(input.runtimeProofEvidenceIds ?? []),
      ],
      nextEvidenceNeed: "none",
      reasons: [
        "Observed evidence contradicts authored intent grounded independently of the current implementation.",
      ],
    };
  }

  if (
    input.observationEvidenceIds.length > 0 &&
    (input.contradictionEvidenceIds?.length ?? 0) > 0 &&
    (
      implementationOnlyAuthored.length > 0 ||
      inferred.length > 0
    )
  ) {
    return {
      disposition: "ambiguous-intent",
      subjectIds: [...input.subjectIds],
      basisInvariantIds: [
        ...implementationOnlyAuthored,
        ...inferred,
      ].map((item) => item.id),
      basisDesignRuleIds: [],
      basisDesignEvidenceIds: [],
      evidenceIds: [
        ...input.observationEvidenceIds,
        ...(input.contradictionEvidenceIds ?? []),
        ...(input.runtimeProofEvidenceIds ?? []),
      ],
      nextEvidenceNeed: "authored-intent",
      reasons: [
        implementationOnlyAuthored.length > 0
          ? "Current implementation evidence cannot independently establish intended gameplay; authored design authority is required before defect classification."
          : "Observed evidence contradicts inferred intent, but inferred intent is not sufficient to classify a gameplay bug.",
      ],
    };
  }

  return {
    disposition: "insufficient-evidence",
    subjectIds: [...input.subjectIds],
    basisInvariantIds: applicable.map((item) => item.id),
    basisDesignRuleIds: [],
    basisDesignEvidenceIds: [],
    evidenceIds: [
      ...input.observationEvidenceIds,
      ...(input.runtimeProofEvidenceIds ?? []),
    ],
    nextEvidenceNeed: "contradiction-proof",
      reasons: [
      "No evidenced contradiction or design match is strong enough to classify the observation.",
    ],
  };
}