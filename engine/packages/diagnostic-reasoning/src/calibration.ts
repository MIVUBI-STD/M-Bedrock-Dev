export type DiagnosticCalibrationOutcome =
  | "true-positive"
  | "false-positive"
  | "false-negative"
  | "unknown";

export interface DiagnosticCalibrationObservation {
  detectorId: string;
  outcome: DiagnosticCalibrationOutcome;
  sourceStyle?: string;
  proofTier?: string;
  targetVersion?: string;
  evidenceId?: string;
}

export interface DiagnosticCalibrationSegment {
  key: string;
  detectorId: string;
  sourceStyle?: string;
  proofTier?: string;
  targetVersion?: string;
  reviewed: number;
  truePositive: number;
  falsePositive: number;
  falseNegative: number;
  unknown: number;
  precision: number | null;
  recall: number | null;
  state: "insufficient-sample" | "empirical";
}

export interface DiagnosticCalibrationReport {
  schemaVersion: 1;
  minimumReviewed: number;
  segments: readonly DiagnosticCalibrationSegment[];
}

function segmentKey(
  item: DiagnosticCalibrationObservation,
): string {
  return [
    item.detectorId,
    item.sourceStyle ?? "*",
    item.proofTier ?? "*",
    item.targetVersion ?? "*",
  ].join("|");
}

export function buildDiagnosticCalibrationReport(
  observations: readonly DiagnosticCalibrationObservation[],
  minimumReviewed = 10,
): DiagnosticCalibrationReport {
  if (!Number.isInteger(minimumReviewed) || minimumReviewed < 1) {
    throw new Error("minimumReviewed must be a positive integer.");
  }

  const buckets = new Map<string, DiagnosticCalibrationObservation[]>();
  for (const item of observations) {
    if (!item.detectorId.trim()) continue;
    const key = segmentKey(item);
    const list = buckets.get(key) ?? [];
    list.push(item);
    buckets.set(key, list);
  }

  const segments = [...buckets.entries()].map(([key, items]) => {
    const first = items[0]!;
    const truePositive = items.filter((x) => x.outcome === "true-positive").length;
    const falsePositive = items.filter((x) => x.outcome === "false-positive").length;
    const falseNegative = items.filter((x) => x.outcome === "false-negative").length;
    const unknown = items.filter((x) => x.outcome === "unknown").length;
    const reviewed = items.length;
    const precisionDenominator = truePositive + falsePositive;
    const recallDenominator = truePositive + falseNegative;

    return {
      key,
      detectorId: first.detectorId,
      ...(first.sourceStyle === undefined ? {} : { sourceStyle: first.sourceStyle }),
      ...(first.proofTier === undefined ? {} : { proofTier: first.proofTier }),
      ...(first.targetVersion === undefined ? {} : { targetVersion: first.targetVersion }),
      reviewed,
      truePositive,
      falsePositive,
      falseNegative,
      unknown,
      precision: precisionDenominator === 0 ? null : truePositive / precisionDenominator,
      recall: recallDenominator === 0 ? null : truePositive / recallDenominator,
      state: reviewed >= minimumReviewed ? "empirical" as const : "insufficient-sample" as const,
    };
  }).sort((a, b) => a.key.localeCompare(b.key));

  return {
    schemaVersion: 1,
    minimumReviewed,
    segments,
  };
}
