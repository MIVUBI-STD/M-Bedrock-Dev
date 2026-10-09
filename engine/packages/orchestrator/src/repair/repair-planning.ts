import {
  planLinearTopologyRepair,
  type TopologyRepairProposal,
} from "../../../repair/src/index.js";
import type { analyzeFunctionTopology } from "../inspection/topology-analysis.js";

export interface InspectionRepairCandidate {
  kind: "linear-topology-outlier";
  diagnosticCode: "TOPOLOGY_TRANSLATION_OUTLIER";
  sourcePath: string;
  line?: number;
  status: "proposal" | "unsupported" | "unavailable";
  reason?: string;
  proposal?: TopologyRepairProposal;
}

export function planInspectionRepairs(
  topology: ReturnType<typeof analyzeFunctionTopology>,
  sourceFingerprint?: string,
): InspectionRepairCandidate[] {
  return topology.linearOutliers.map((outlier) => {
    const record = topology.spatialRecords[outlier.effectIndex]!;
    const base = {
      kind: "linear-topology-outlier" as const,
      diagnosticCode: "TOPOLOGY_TRANSLATION_OUTLIER" as const,
      sourcePath: outlier.sourcePath,
      ...(record.effect.source.range?.lineStart
        ? { line: record.effect.source.range.lineStart }
        : {}),
    };

    if (!sourceFingerprint) {
      return {
        ...base,
        status: "unavailable" as const,
        reason: "Repair planning requires an artifact source fingerprint.",
      };
    }

    if (!record.directTopLevel) {
      return {
        ...base,
        status: "unsupported" as const,
        reason: "Nested execute spatial effects are diagnostic-only until safe command splicing is implemented.",
      };
    }

    if (record.effect.kind !== "fill" && record.effect.kind !== "setblock") {
      return {
        ...base,
        status: "unsupported" as const,
        reason: "Only fill and setblock topology effects are eligible for automatic repair.",
      };
    }

    const plan = planLinearTopologyRepair({
      outlier,
      effect: record.effect,
      rawCommand: record.rawCommand,
    }, sourceFingerprint);

    if (plan.status === "unsupported") {
      return {
        ...base,
        status: "unsupported" as const,
        reason: plan.reason,
      };
    }

    return {
      ...base,
      status: "proposal" as const,
      proposal: plan.proposal,
    };
  });
}
