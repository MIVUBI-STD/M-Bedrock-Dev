export interface EngineeringEvidenceChannel {
  readonly channel:
    | "source"
    | "world"
    | "runtime"
    | "tester"
    | "player-feedback"
    | "platform";
  readonly evidenceIds: readonly string[];
  readonly statement: string;
}

export interface QuantitativeConstraint {
  readonly id: string;
  readonly expression: string;
  readonly observedValue?: number;
  readonly limitValue?: number;
  readonly unit?: string;
  readonly satisfied?: boolean;
  readonly evidenceIds: readonly string[];
}

export interface RepairAlternative {
  readonly id: string;
  readonly summary: string;
  readonly resolves: readonly string[];
  readonly introduces?: readonly string[];
  readonly validation?: readonly string[];
}

export interface EngineeringAnalysisInput {
  readonly symptom: string;
  readonly immediateCause: string;
  readonly rootCause?: string;
  readonly gameplayConsequence: string;
  readonly designContradiction?: string;
  readonly evidenceChannels: readonly EngineeringEvidenceChannel[];
  readonly constraints?: readonly QuantitativeConstraint[];
  readonly alternatives?: readonly RepairAlternative[];
  readonly verification?: readonly string[];
}

export interface EngineeringAnalysis {
  readonly symptom: string;
  readonly causalChain: readonly string[];
  readonly gameplayConsequence: string;
  readonly designContradiction?: string;
  readonly evidenceChannels: readonly EngineeringEvidenceChannel[];
  readonly convergence:
    | "single-source"
    | "multi-source";
  readonly constraints: readonly QuantitativeConstraint[];
  readonly alternatives: readonly RepairAlternative[];
  readonly verification: readonly string[];
}

export function buildEngineeringAnalysis(
  input: EngineeringAnalysisInput,
): EngineeringAnalysis {
  const channels = [
    ...new Set(
      input.evidenceChannels
        .filter((item) => item.evidenceIds.length > 0)
        .map((item) => item.channel),
    ),
  ];

  const causalChain = [
    input.symptom,
    input.immediateCause,
    ...(input.rootCause === undefined
      ? []
      : [input.rootCause]),
    input.gameplayConsequence,
  ].filter((value) => value.trim().length > 0);

  return {
    symptom: input.symptom,
    causalChain,
    gameplayConsequence: input.gameplayConsequence,
    ...(input.designContradiction === undefined
      ? {}
      : { designContradiction: input.designContradiction }),
    evidenceChannels: [...input.evidenceChannels],
    convergence:
      channels.length >= 2
        ? "multi-source"
        : "single-source",
    constraints: [...(input.constraints ?? [])],
    alternatives: [...(input.alternatives ?? [])],
    verification: [...(input.verification ?? [])],
  };
}

export function evaluateUpperBoundConstraint(
  input: {
    readonly id: string;
    readonly expression: string;
    readonly observedValue: number;
    readonly limitValue: number;
    readonly unit?: string;
    readonly evidenceIds?: readonly string[];
  },
): QuantitativeConstraint {
  return {
    id: input.id,
    expression: input.expression,
    observedValue: input.observedValue,
    limitValue: input.limitValue,
    ...(input.unit === undefined
      ? {}
      : { unit: input.unit }),
    satisfied:
      input.observedValue <= input.limitValue,
    evidenceIds: [
      ...new Set(input.evidenceIds ?? []),
    ].sort(),
  };
}

export function renderEngineeringAnalysis(
  analysis: EngineeringAnalysis,
): string {
  const lines: string[] = [];

  lines.push("Root Cause");
  lines.push(
    analysis.causalChain
      .slice(1, -1)
      .join(" -> ") ||
      analysis.causalChain[0] ||
      "Unknown",
  );

  if (analysis.designContradiction) {
    lines.push("");
    lines.push("Design Contradiction");
    lines.push(analysis.designContradiction);
  }

  if (analysis.constraints.length > 0) {
    lines.push("");
    lines.push("Constraints");
    for (const item of analysis.constraints) {
      const suffix =
        item.observedValue === undefined ||
        item.limitValue === undefined
          ? ""
          : " (" +
            String(item.observedValue) +
            (item.unit ? " " + item.unit : "") +
            " vs limit " +
            String(item.limitValue) +
            (item.unit ? " " + item.unit : "") +
            ")";
      lines.push("- " + item.expression + suffix);
    }
  }

  if (analysis.evidenceChannels.length > 0) {
    lines.push("");
    lines.push("Evidence Convergence");
    for (const item of analysis.evidenceChannels) {
      lines.push(
        "- " +
        item.channel +
        ": " +
        item.statement,
      );
    }
  }

  if (analysis.alternatives.length > 0) {
    lines.push("");
    lines.push("Repair Directions");
    for (const item of analysis.alternatives) {
      lines.push("- " + item.summary);
    }
  }

  if (analysis.verification.length > 0) {
    lines.push("");
    lines.push("Verification");
    analysis.verification.forEach((step, index) => {
      lines.push(String(index + 1) + ". " + step);
    });
  }

  return lines.join("\n");
}
