import type { MutationScoreReport } from "../mutation/mutation-types.js";

export interface CapabilityTruthLike {
  taskCapabilities: readonly {
    id: string;
    owner: string;
    status: "declared-only" | "implementation-present" | "owner-has-tests";
    runtimeOnly: boolean;
    proofBinding?: { state: "bound" | "unbound"; kind?: string; paths?: readonly string[] };
  }[];
}

export interface CalibrationSegmentLike {
  detectorId: string;
  reviewed: number;
  precision: number | null;
  recall: number | null;
  state: "insufficient-sample" | "empirical";
}

export interface CoverageQualityInput {
  capabilityTruth: CapabilityTruthLike;
  mutation?: MutationScoreReport;
  calibration?: readonly CalibrationSegmentLike[];
}

export interface CoverageQualityRow {
  key: string;
  category: "capability" | "mutation-domain" | "detector";
  status: "strong" | "partial" | "weak" | "runtime-only" | "insufficient-data";
  score?: number;
  reasons: readonly string[];
}

export interface CoverageQualityDashboard {
  schemaVersion: 1;
  rows: readonly CoverageQualityRow[];
  summary: Readonly<Record<CoverageQualityRow["status"], number>>;
}

export function buildCoverageQualityDashboard(input: CoverageQualityInput): CoverageQualityDashboard {
  const rows: CoverageQualityRow[] = [];
  for (const capability of input.capabilityTruth.taskCapabilities) {
    if (capability.runtimeOnly) {
      rows.push({ key: capability.id, category: "capability", status: "runtime-only", reasons: ["Capability requires LOCAL_MINECRAFT or LIVE_MINECRAFT context."] });
      continue;
    }
    const proofBound=capability.proofBinding?.state==="bound";
    rows.push({
      key: capability.id,
      category: "capability",
      status:
        capability.status === "owner-has-tests" && proofBound
          ? "partial"
          : capability.status === "implementation-present"
            ? "weak"
            : "insufficient-data",
      reasons: [
        capability.status === "owner-has-tests" && proofBound
          ? "Owner contains tests and the capability has an explicit proof binding; current-session execution or pass status is not implied."
          : capability.status === "owner-has-tests"
            ? "Owner contains tests but capability-specific regression proof is unbound; no current-session execution is implied."
            : capability.status === "implementation-present"
              ? "Implementation exists without detected owner-level test presence."
              : "Capability is declared without detected implementation.",
      ],
    });
  }
  for (const [domain, item] of Object.entries(input.mutation?.byDomain ?? {})) {
    const valid = item.killed + item.survived;
    const score = valid === 0 ? undefined : item.killed / valid;
    rows.push({ key: domain, category: "mutation-domain", status: score === undefined ? "insufficient-data" : score >= 0.9 ? "strong" : score >= 0.7 ? "partial" : "weak", ...(score === undefined ? {} : { score }), reasons: [score === undefined ? "No valid mutation outcomes are available." : "Mutation kill rate is " + (score * 100).toFixed(1) + "%."] });
  }
  for (const segment of input.calibration ?? []) {
    const score = segment.precision === null || segment.recall === null ? undefined : Math.min(segment.precision, segment.recall);
    rows.push({ key: segment.detectorId, category: "detector", status: segment.state === "insufficient-sample" || score === undefined ? "insufficient-data" : score >= 0.9 ? "strong" : score >= 0.7 ? "partial" : "weak", ...(score === undefined ? {} : { score }), reasons: [segment.state === "insufficient-sample" ? "Reviewed calibration sample is below the minimum threshold." : "Detector quality uses the lower of empirical precision and recall.", "Reviewed observations: " + segment.reviewed + "."] });
  }
  const summary = { strong: 0, partial: 0, weak: 0, "runtime-only": 0, "insufficient-data": 0 } satisfies Record<CoverageQualityRow["status"], number>;
  for (const row of rows) summary[row.status] += 1;
  return { schemaVersion: 1, rows: rows.sort((a,b)=>a.category.localeCompare(b.category)||a.key.localeCompare(b.key)), summary };
}
