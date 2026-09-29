import {
  assessConfirmedDefectGrouping,
  decideBugGrouping,
  type ConfirmedDefectGroup,
} from "./grouping.js";
import type {
  BugImpactAssessment,
  BugPrimaryFailure,
} from "./decision.js";
import type {
  ConfirmedDefect,
  ConfirmedDefectExpectedBasis,
  ConfirmedDefectObservation,
} from "./confirmed-defect.js";

export interface CanonicalDefectNarrative {
  readonly semanticKey: string;
  readonly title: string;
  readonly problem: string;
  readonly expected: Pick<
    ConfirmedDefectExpectedBasis,
    "statement"
  >;
  readonly observed: Pick<
    ConfirmedDefectObservation,
    "statement"
  >;
  readonly primaryFailure: BugPrimaryFailure;
  readonly aiAnalysis?: string;
  readonly suggestedFix?: string;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function maxByRank<T extends string>(
  values: readonly T[],
  rank: Readonly<Record<T, number>>,
): T {
  return [...values].sort((a, b) => rank[b] - rank[a])[0]!;
}

function mergeImpact(
  defects: readonly ConfirmedDefect[],
): BugImpactAssessment {
  return {
    progression: maxByRank(
      defects.map((item) => item.impact.progression),
      {
        unaffected: 0,
        degraded: 1,
        blocked: 2,
      },
    ),
    recovery: maxByRank(
      defects.map((item) => item.impact.recovery),
      {
        normal: 0,
        abnormal: 1,
        none: 2,
      },
    ),
    stability: maxByRank(
      defects.map((item) => item.impact.stability),
      {
        stable: 0,
        "crash-or-freeze": 1,
      },
    ),
    coreMechanic: maxByRank(
      defects.map((item) => item.impact.coreMechanic),
      {
        correct: 0,
        "materially-wrong": 1,
      },
    ),
    importantState: maxByRank(
      defects.map((item) => item.impact.importantState),
      {
        correct: 0,
        "materially-wrong": 1,
      },
    ),
    fairness: maxByRank(
      defects.map((item) => item.impact.fairness),
      {
        unaffected: 0,
        "materially-affected": 1,
      },
    ),
  };
}

function canonicalFoundBy(
  defects: readonly ConfirmedDefect[],
): ConfirmedDefect["foundBy"] {
  return defects.some((item) => item.foundBy === "tester")
    ? "tester"
    : "ai";
}

export function resolveConfirmedDefectGroup(
  group: ConfirmedDefectGroup,
  narrative: CanonicalDefectNarrative,
): ConfirmedDefect {
  if (group.defects.length < 2) {
    throw new Error(
      "Canonical group resolution requires at least two defects.",
    );
  }

  const [first, ...rest] = group.defects;
  if (!first) {
    throw new Error("Confirmed defect group is empty.");
  }

  for (const item of rest) {
    if (
      decideBugGrouping(
        assessConfirmedDefectGrouping(first, item),
      ) !== "merge"
    ) {
      throw new Error(
        "Confirmed defect group contains semantically incompatible defects.",
      );
    }
  }

  const sourceEvidence = group.defects
    .flatMap((item) => item.sourceEvidence ?? [])
    .filter((item, index, values) => {
      const key = [
        item.source.artifactId,
        item.source.relativePath,
        item.source.range?.lineStart ?? "",
        item.source.range?.lineEnd ?? "",
        item.reason,
      ].join("|");
      return values.findIndex((candidate) => [
        candidate.source.artifactId,
        candidate.source.relativePath,
        candidate.source.range?.lineStart ?? "",
        candidate.source.range?.lineEnd ?? "",
        candidate.reason,
      ].join("|") === key) === index;
    })
    .slice(0, 3);

  const reproduction = unique(
    group.defects.flatMap((item) =>
      item.reproduction ?? []
    ),
  );

  const mustPreserve = unique(
    group.defects.flatMap((item) =>
      item.mustPreserve ?? []
    ),
  );

  const confirmationEvidence = unique(
    group.defects.map((item) =>
      item.confirmation.evidence
    ),
  ).join(" | ");

  return {
    semanticKey: narrative.semanticKey,
    foundBy: canonicalFoundBy(group.defects),
    confirmation: {
      basis: first.confirmation.basis,
      evidence: confirmationEvidence,
    },
    impact: mergeImpact(group.defects),
    primaryFailure: narrative.primaryFailure,
    title: narrative.title,
    problem: narrative.problem,
    expected: {
      authority: first.expected.authority,
      statement: narrative.expected.statement,
      evidenceIds: unique(
        group.defects.flatMap((item) =>
          item.expected.evidenceIds
        ),
      ),
    },
    observed: {
      statement: narrative.observed.statement,
      evidenceIds: unique(
        group.defects.flatMap((item) =>
          item.observed.evidenceIds
        ),
      ),
    },
    ...(reproduction.length === 0
      ? {}
      : { reproduction }),
    ...(narrative.aiAnalysis === undefined
      ? {}
      : { aiAnalysis: narrative.aiAnalysis }),
    ...(sourceEvidence.length === 0
      ? {}
      : { sourceEvidence }),
    ...(narrative.suggestedFix === undefined
      ? {}
      : { suggestedFix: narrative.suggestedFix }),
    ...(mustPreserve.length === 0
      ? {}
      : { mustPreserve }),
    brokenInvariantIds: unique(
      group.defects.flatMap((item) =>
        item.brokenInvariantIds
      ),
    ),
    repairUnitIds: unique(
      group.defects.flatMap((item) =>
        item.repairUnitIds
      ),
    ),
    ...(first.causalIncidentId === undefined
      ? {}
      : { causalIncidentId: first.causalIncidentId }),
  };
}
