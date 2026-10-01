import type {
  IntentAdjudicationDisposition,
  IntentAuthorityStrength,
  ResolvedGameDesignIntentRule,
} from "../../../game-design-spec/src/index.js";

export type ObservationIntentRelation =
  | "supports-observed"
  | "contradicts-observed"
  | "unclear";

export type IntentConcernKind =
  | "implementation"
  | "balance"
  | "ux"
  | "content"
  | "compatibility";

export interface IntentAdjudicationInput {
  readonly resolvedRule?: ResolvedGameDesignIntentRule;
  readonly relation: ObservationIntentRelation;
  readonly concernKind?: IntentConcernKind;
  readonly observationEvidenceIds: readonly string[];
  readonly implementationEvidenceIds?: readonly string[];
}

export interface IntentAdjudicationResult {
  readonly disposition: IntentAdjudicationDisposition;
  readonly authority: IntentAuthorityStrength;
  readonly ruleId?: string;
  readonly reasons: readonly string[];
  readonly evidenceIds: readonly string[];
}

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(
    values.map((value) => value.trim()).filter(Boolean),
  )].sort();
}

export function adjudicateIntent(
  input: IntentAdjudicationInput,
): IntentAdjudicationResult {
  const evidenceIds = unique([
    ...input.observationEvidenceIds,
    ...(input.implementationEvidenceIds ?? []),
  ]);

  const resolved = input.resolvedRule;
  if (!resolved) {
    return {
      disposition: "design-ambiguous",
      authority: "unknown",
      reasons: [
        "No applicable Game Design intent rule establishes the expected behavior for this context.",
      ],
      evidenceIds,
    };
  }

  const rule = resolved.rule;
  if (resolved.exceptionId) {
    return {
      disposition: "working-as-designed",
      authority: resolved.authority,
      ruleId: rule.id,
      reasons: [
        "An explicit Game Design exception applies in the observed state: " +
          resolved.exceptionId +
          ".",
      ],
      evidenceIds,
    };
  }

  if (
    rule.outcome === "unspecified" ||
    input.relation === "unclear"
  ) {
    return {
      disposition: "design-ambiguous",
      authority: resolved.authority,
      ruleId: rule.id,
      reasons: [
        "The applicable Game Design rule does not establish a decisive expected outcome for this observation.",
      ],
      evidenceIds,
    };
  }

  if (input.relation === "supports-observed") {
    if (
      input.concernKind === "balance" ||
      input.concernKind === "ux"
    ) {
      return {
        disposition: "design-review",
        authority: resolved.authority,
        ruleId: rule.id,
        reasons: [
          "Observed behavior matches the intended mechanic; the concern is about design quality rather than implementation correctness.",
        ],
        evidenceIds,
      };
    }

    return {
      disposition: "working-as-designed",
      authority: resolved.authority,
      ruleId: rule.id,
      reasons: [
        "Observed behavior is consistent with the applicable Game Design rule.",
      ],
      evidenceIds,
    };
  }

  if (
    resolved.authority === "authoritative" ||
    resolved.authority === "strong"
  ) {
    return {
      disposition: "suspected-defect",
      authority: resolved.authority,
      ruleId: rule.id,
      reasons: [
        "Observed behavior contradicts an applicable Game Design rule with sufficient intent authority.",
      ],
      evidenceIds,
    };
  }

  return {
    disposition: "design-ambiguous",
    authority: resolved.authority,
    ruleId: rule.id,
    reasons: [
      "The observation conflicts with an inferred or unknown intent source; stronger design authority is required before calling it a defect.",
    ],
    evidenceIds,
  };
}
