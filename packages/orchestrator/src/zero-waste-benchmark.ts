import type {
  ZeroWasteExecutionSummary,
} from "./zero-waste-execution-summary.js";
import type {
  CompiledContextPack,
} from "./context-compiler.js";

export interface ZeroWasteBenchmarkTargets {
  minimumDiagnosisReuseRatio?: number;
  minimumSemanticSkipRatio?: number;
  minimumValidationSkipRatio?: number;
  maximumContextTruncationRatio?: number;
}

export interface ZeroWasteBenchmarkInput {
  id: string;
  runMode: "cold" | "warm";
  summary: ZeroWasteExecutionSummary;
  context?: CompiledContextPack;
  targets?: ZeroWasteBenchmarkTargets;
}

export interface ZeroWasteBenchmarkMetric {
  id:
    | "diagnosis-reuse"
    | "semantic-skip"
    | "validation-skip"
    | "context-truncation";
  value: number;
  target?: number;
  disposition:
    | "pass"
    | "fail"
    | "unscored";
  detail: string;
}

export interface ZeroWasteBenchmarkReport {
  schemaVersion: 1;
  id: string;
  runMode: "cold" | "warm";
  disposition:
    | "pass"
    | "fail"
    | "unscored";
  metrics:
    readonly ZeroWasteBenchmarkMetric[];
  wasteSignals: readonly string[];
  reasons: readonly string[];
}

function boundedRatio(
  value: number,
): number {
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    throw new Error(
      "Zero-waste benchmark ratios must be finite values from 0 through 1.",
    );
  }
  return value;
}

function minimumMetric(
  id:
    ZeroWasteBenchmarkMetric["id"],
  value: number,
  target: number | undefined,
  detail: string,
): ZeroWasteBenchmarkMetric {
  const normalized =
    boundedRatio(value);

  if (target === undefined) {
    return {
      id,
      value: normalized,
      disposition: "unscored",
      detail,
    };
  }

  const threshold =
    boundedRatio(target);

  return {
    id,
    value: normalized,
    target: threshold,
    disposition:
      normalized >= threshold
        ? "pass"
        : "fail",
    detail,
  };
}

function contextTruncationRatio(
  pack:
    CompiledContextPack |
    undefined,
): number | undefined {
  if (!pack) return undefined;

  const included =
    pack.semantic.nodes.length +
    pack.semantic.edges.length +
    pack.intent.nodes.length +
    pack.intent.invariants.length +
    pack.intent.unknowns.length +
    pack.intent.evidence.length;

  const omitted =
    pack.truncation.semanticNodes +
    pack.truncation.semanticEdges +
    pack.truncation.intentNodes +
    pack.truncation.invariants +
    pack.truncation.unknowns +
    pack.truncation.evidence;

  const total =
    included + omitted;

  return total === 0
    ? 0
    : omitted / total;
}

function maximumMetric(
  id:
    ZeroWasteBenchmarkMetric["id"],
  value: number,
  target: number | undefined,
  detail: string,
): ZeroWasteBenchmarkMetric {
  const normalized =
    boundedRatio(value);

  if (target === undefined) {
    return {
      id,
      value: normalized,
      disposition: "unscored",
      detail,
    };
  }

  const threshold =
    boundedRatio(target);

  return {
    id,
    value: normalized,
    target: threshold,
    disposition:
      normalized <= threshold
        ? "pass"
        : "fail",
    detail,
  };
}

export function evaluateZeroWasteBenchmark(
  input: ZeroWasteBenchmarkInput,
): ZeroWasteBenchmarkReport {
  if (!input.id.trim()) {
    throw new Error(
      "Zero-waste benchmark id must be non-empty.",
    );
  }

  const metrics:
    ZeroWasteBenchmarkMetric[] = [];

  if (input.runMode === "warm") {
    metrics.push(
      minimumMetric(
        "diagnosis-reuse",
        input.summary.diagnosis
          .reuseRatio,
        input.targets
          ?.minimumDiagnosisReuseRatio,
        "Share of successful deterministic diagnosis steps reused instead of recomputed on a warm run.",
      ),
    );
  }

  if (
    input.summary.semanticImpact
  ) {
    metrics.push(
      minimumMetric(
        "semantic-skip",
        input.summary.semanticImpact
          .skipRatio,
        input.targets
          ?.minimumSemanticSkipRatio,
        "Share of semantic nodes outside the affected dependency closure.",
      ),
    );
  }

  if (input.summary.validation) {
    metrics.push(
      minimumMetric(
        "validation-skip",
        input.summary.validation
          .skipRatio,
        input.targets
          ?.minimumValidationSkipRatio,
        "Share of validation scenarios proven outside the affected closure.",
      ),
    );
  }

  const truncation =
    contextTruncationRatio(
      input.context,
    );

  if (truncation !== undefined) {
    metrics.push(
      maximumMetric(
        "context-truncation",
        truncation,
        input.targets
          ?.maximumContextTruncationRatio,
        "Share of eligible context items omitted by the explicit context budget.",
      ),
    );
  }

  const failed =
    metrics.filter(
      (metric) =>
        metric.disposition ===
        "fail",
    );
  const scored =
    metrics.filter(
      (metric) =>
        metric.disposition !==
        "unscored",
    );

  const wasteSignals: string[] = [];

  if (
    input.runMode === "warm" &&
    input.summary.diagnosis
      .totalSteps > 1 &&
    input.summary.diagnosis
      .reusedSteps === 0
  ) {
    wasteSignals.push(
      "repeated-diagnosis-without-reuse",
    );
  }

  if (
    input.summary.semanticImpact &&
    input.summary.semanticImpact
      .totalNodes > 0 &&
    input.summary.semanticImpact
      .skippedNodes === 0
  ) {
    wasteSignals.push(
      "full-semantic-closure",
    );
  }

  if (
    input.summary.validation &&
    input.summary.validation
      .totalScenarios > 1 &&
    input.summary.validation
      .skippedScenarios === 0
  ) {
    wasteSignals.push(
      "full-validation-set",
    );
  }

  if (
    truncation !== undefined &&
    truncation > 0.5
  ) {
    wasteSignals.push(
      "context-budget-high-truncation",
    );
  }

  return {
    schemaVersion: 1,
    id: input.id,
    runMode: input.runMode,
    disposition:
      failed.length > 0
        ? "fail"
        : scored.length > 0
          ? "pass"
          : "unscored",
    metrics,
    wasteSignals,
    reasons: [
      input.runMode === "cold"
        ? "Cold run: diagnosis reuse is not scored because no prior cache is assumed."
        : "Warm run: deterministic diagnosis reuse is eligible for scoring.",
      failed.length > 0
        ? String(failed.length) +
          " zero-waste target(s) missed."
        : scored.length > 0
          ? "All configured zero-waste targets passed."
          : "No benchmark targets were configured; metrics are informational only.",
      wasteSignals.length > 0
        ? "Waste signals: " +
          wasteSignals.join(", ") +
          "."
        : "No heuristic waste signal was detected.",
    ],
  };
}

function pct(
  value: number,
): string {
  return (
    Math.round(value * 1000) /
    10
  ).toFixed(1) + "%";
}

export function zeroWasteBenchmarkText(
  report:
    ZeroWasteBenchmarkReport,
): string {
  const lines = [
    "Zero-Waste Benchmark",
    "ID: " + report.id,
    "Mode: " + report.runMode,
    "Status: " +
      report.disposition,
    "",
    "Metrics",
  ];

  for (const metric of report.metrics) {
    lines.push(
      "- " +
        metric.id +
        ": " +
        pct(metric.value) +
        (
          metric.target ===
          undefined
            ? " [unscored]"
            : " / target " +
              pct(metric.target) +
              " [" +
              metric.disposition +
              "]"
        ),
    );
  }

  lines.push("", "Waste signals");
  if (
    report.wasteSignals.length === 0
  ) {
    lines.push("- none");
  } else {
    for (
      const signal of
      report.wasteSignals
    ) {
      lines.push("- " + signal);
    }
  }

  return lines.join("\n") + "\n";
}
