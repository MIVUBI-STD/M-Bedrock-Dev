import type {
  EngineeringReviewInvalidationAction,
  EngineeringReviewProjection,
  EngineeringReviewRuntimeAssessment,
} from "../../../packages/orchestrator/src/index.js";

export type ReviewUiSection = "attention" | "understood";

export type ReviewUiState =
  | "outdated-proof"
  | "confirmed-defect"
  | "probable-defect"
  | "runtime-test-required"
  | "intended-behavior-unclear"
  | "more-evidence-needed"
  | "designed-behavior"
  | "engine-constraint"
  | "compatibility-difference"
  | "critical-diagnostic";

export interface ReviewUiTechnical {
  finding?: string;
  source?: string;
  evidenceIds?: readonly string[];
  subjectIds?: readonly string[];
  basisInvariantIds?: readonly string[];
  rawReason?: string;
}

export interface ReviewUiItem {
  id: string;
  title: string;
  state: ReviewUiState;
  stateLabel: string;
  severity?: "Critical" | "Medium" | "Minor" | "Info";
  whatHappened: string;
  why: string;
  nextAction?: string;
  section: ReviewUiSection;
  technical?: ReviewUiTechnical;
}

export interface ReviewUiViewModel {
  artifact: {
    id: string;
    targetLabel: string;
  };
  attentionCount: number;
  items: readonly ReviewUiItem[];
}

function words(value: string): string {
  return value
    .replace(/[:._/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function stateLabel(
  disposition: EngineeringReviewRuntimeAssessment["disposition"],
): string {
  switch (disposition) {
    case "confirmed-defect": return "Confirmed defect";
    case "probable-defect": return "Probable defect";
    case "runtime-proof-required": return "Runtime test required";
    case "ambiguous-intent": return "Intended behavior unclear";
    case "insufficient-evidence": return "More evidence needed";
    case "designed-behavior": return "Designed behavior";
    case "engine-constraint": return "Engine constraint";
    case "compatibility-difference": return "Compatibility difference";
  }
}

function stateFor(
  disposition: EngineeringReviewRuntimeAssessment["disposition"],
): ReviewUiState {
  switch (disposition) {
    case "ambiguous-intent": return "intended-behavior-unclear";
    case "insufficient-evidence": return "more-evidence-needed";
    case "runtime-proof-required": return "runtime-test-required";
    default: return disposition;
  }
}

function sectionFor(
  disposition: EngineeringReviewRuntimeAssessment["disposition"],
): ReviewUiSection {
  return disposition === "designed-behavior" ||
      disposition === "engine-constraint" ||
      disposition === "compatibility-difference"
    ? "understood"
    : "attention";
}

function actionLabel(
  need: EngineeringReviewRuntimeAssessment["nextEvidenceNeed"],
): string | undefined {
  switch (need) {
    case "none": return undefined;
    case "intent-grounding": return "Review intended behavior";
    case "intent-clarification": return "Clarify behavior";
    case "authored-intent": return "Add authored behavior evidence";
    case "contradiction-proof": return "Collect evidence";
    case "runtime-proof": return "Prepare runtime test";
    case "runtime-evidence-integrity": return "Collect runtime evidence again";
  }
}

function invalidationActionLabel(
  action: EngineeringReviewInvalidationAction,
): string {
  switch (action) {
    case "reinspect-artifact": return "Analyze again";
    case "rebuild-analysis": return "Analyze again";
    case "revalidate-contract": return "Re-run validation";
    case "refresh-knowledge": return "Analyze again";
    case "rerun-diagnosis": return "Analyze again";
    case "reassess-repair": return "Review repair";
    case "rerun-runtime-proof": return "Prepare runtime test";
    case "rerun-preservation-proof": return "Re-run validation";
    case "rerun-validation": return "Re-run validation";
    case "follow-replacement": return "View newer result";
    case "inspect-upstream": return "Review related proof";
    case "review-reason": return "Review details";
  }
}

function targetLabel(
  target: EngineeringReviewProjection["artifact"]["target"],
): string {
  const edition = target.edition === "education"
    ? "Education"
    : "Bedrock";
  return target.version
    ? edition + " · " + target.version
    : edition;
}

function runtimeItem(
  assessment: EngineeringReviewRuntimeAssessment,
): ReviewUiItem {
  const title = words(assessment.outcomeId);
  const why = assessment.reasons.join(" ");
  const nextAction = actionLabel(assessment.nextEvidenceNeed);

  return {
    id: assessment.id,
    title,
    state: stateFor(assessment.disposition),
    stateLabel: stateLabel(assessment.disposition),
    whatHappened:
      "M-Bedrock observed the runtime outcome “" +
      title +
      "”.",
    why: why || "No additional explanation was recorded.",
    ...(nextAction === undefined ? {} : { nextAction }),
    section: sectionFor(assessment.disposition),
    technical: {
      evidenceIds: assessment.evidenceIds,
      subjectIds: assessment.subjectIds,
      basisInvariantIds: assessment.basisInvariantIds,
    },
  };
}

export function buildReviewUiViewModel(
  review: EngineeringReviewProjection,
): ReviewUiViewModel {
  const invalidations: ReviewUiItem[] = review.invalidation.items
    .filter((item) => item.blocking)
    .map((item) => ({
      id: item.id,
      title: item.summary,
      state: "outdated-proof",
      stateLabel: "Proof is outdated",
      whatHappened: item.summary,
      why: item.reason,
      nextAction: invalidationActionLabel(item.nextAction),
      section: "attention",
      technical: {
        rawReason: item.reason,
      },
    }));

  const runtime = review.runtimeAssessments.map(runtimeItem);

  const definitions = new Map(
    review.diagnosticDefinitions.map((definition) => [
      definition.code,
      definition,
    ]),
  );

  const criticalDiagnostics: ReviewUiItem[] = review.diagnostics
    .filter((finding) => finding.severity === "critical")
    .map((finding) => {
      const definition = definitions.get(finding.code);
      return {
        id: finding.id,
        title: definition?.title ?? words(finding.code),
        state: "critical-diagnostic",
        stateLabel: "Critical diagnostic",
        severity: "Critical",
        whatHappened: finding.message,
        why:
          "This finding is critical, but it is not automatically a confirmed defect.",
        nextAction: "Review diagnostic",
        section: "attention",
        technical: {
          finding: finding.code,
          ...(finding.source === undefined
            ? {}
            : { source: finding.source.relativePath }),
        },
      };
    });

  const laneOrder = new Map(
    review.priority.order.map((lane, index) => [lane, index]),
  );

  function rank(item: ReviewUiItem): number {
    if (item.state === "outdated-proof") {
      return laneOrder.get("blocking-proof") ?? 0;
    }
    if (item.state === "confirmed-defect") {
      return laneOrder.get("confirmed-defect") ?? 1;
    }
    if (item.state === "critical-diagnostic") {
      return laneOrder.get("critical-diagnostic") ?? 2;
    }
    if (
      item.state === "runtime-test-required" ||
      item.state === "intended-behavior-unclear" ||
      item.state === "more-evidence-needed"
    ) {
      return laneOrder.get("evidence-required") ?? 3;
    }
    if (item.state === "probable-defect") {
      return laneOrder.get("probable-defect") ?? 4;
    }
    return Number.MAX_SAFE_INTEGER;
  }

  const items = [
    ...invalidations,
    ...runtime,
    ...criticalDiagnostics,
  ].sort((left, right) =>
    (left.section === right.section
      ? 0
      : left.section === "attention" ? -1 : 1) ||
    rank(left) - rank(right) ||
    left.title.localeCompare(right.title)
  );

  return {
    artifact: {
      id: review.artifact.id,
      targetLabel: targetLabel(review.artifact.target),
    },
    attentionCount: items.filter(
      (item) => item.section === "attention",
    ).length,
    items,
  };
}
