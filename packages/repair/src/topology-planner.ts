import type { SourceRef } from "../../project-model/src/source-ref.js";
import { createPatchTransaction } from "./create.js";
import type { PatchTransaction } from "./types.js";

export interface RepairCoordinate {
  mode: "absolute" | "relative" | "local";
  value: number;
}

export interface TopologyOutlierEvidence {
  axis: "x" | "z";
  expectedCoordinate: number;
  actualCoordinate: number;
}

export type TopologyRepairEffect =
  | {
      kind: "fill";
      region: {
        from: { x: RepairCoordinate; y: RepairCoordinate; z: RepairCoordinate };
        to: { x: RepairCoordinate; y: RepairCoordinate; z: RepairCoordinate };
      };
      block: string;
      mode?: string;
      source: SourceRef;
    }
  | {
      kind: "setblock";
      position: { x: RepairCoordinate; y: RepairCoordinate; z: RepairCoordinate };
      block: string;
      mode?: string;
      source: SourceRef;
    };

export interface TopologyRepairCandidate {
  outlier: TopologyOutlierEvidence;
  effect: TopologyRepairEffect;
  rawCommand: string;
}

export type TopologyRepairPlanResult =
  | { status: "planned"; transaction: PatchTransaction }
  | { status: "unsupported"; reason: string };

function absoluteValue(coordinate: RepairCoordinate): number | undefined {
  return coordinate.mode === "absolute" ? coordinate.value : undefined;
}

function planFillReplacement(
  effect: Extract<TopologyRepairEffect, { kind: "fill" }>,
  outlier: TopologyOutlierEvidence,
): string | undefined {
  const fromX = absoluteValue(effect.region.from.x);
  const fromY = absoluteValue(effect.region.from.y);
  const fromZ = absoluteValue(effect.region.from.z);
  const toX = absoluteValue(effect.region.to.x);
  const toY = absoluteValue(effect.region.to.y);
  const toZ = absoluteValue(effect.region.to.z);
  if ([fromX, fromY, fromZ, toX, toY, toZ].some((value) => value === undefined)) return undefined;

  const delta = outlier.expectedCoordinate - outlier.actualCoordinate;
  return [
    "fill",
    String(outlier.axis === "x" ? fromX! + delta : fromX!), String(fromY!), String(outlier.axis === "z" ? fromZ! + delta : fromZ!),
    String(outlier.axis === "x" ? toX! + delta : toX!), String(toY!), String(outlier.axis === "z" ? toZ! + delta : toZ!),
    effect.block,
    ...(effect.mode ? [effect.mode] : []),
  ].join(" ");
}

function planSetblockReplacement(
  effect: Extract<TopologyRepairEffect, { kind: "setblock" }>,
  outlier: TopologyOutlierEvidence,
): string | undefined {
  const x = absoluteValue(effect.position.x);
  const y = absoluteValue(effect.position.y);
  const z = absoluteValue(effect.position.z);
  if (x === undefined || y === undefined || z === undefined) return undefined;

  const delta = outlier.expectedCoordinate - outlier.actualCoordinate;
  return [
    "setblock",
    String(outlier.axis === "x" ? x + delta : x),
    String(y),
    String(outlier.axis === "z" ? z + delta : z),
    effect.block,
    ...(effect.mode ? [effect.mode] : []),
  ].join(" ");
}

export function planLinearTopologyRepair(
  candidate: TopologyRepairCandidate,
  sourceFingerprint: string,
): TopologyRepairPlanResult {
  const { effect, outlier, rawCommand } = candidate;

  if (!effect.source.range?.lineStart || effect.source.range.lineStart !== effect.source.range.lineEnd) {
    return { status: "unsupported", reason: "Topology repair requires exact single-line source evidence." };
  }

  const replacement = effect.kind === "fill"
    ? planFillReplacement(effect, outlier)
    : planSetblockReplacement(effect, outlier);

  if (!replacement || replacement === rawCommand) {
    return { status: "unsupported", reason: "A deterministic absolute-coordinate replacement could not be constructed." };
  }

  return {
    status: "planned",
    transaction: createPatchTransaction({
      title: "repair linear topology coordinate outlier",
      sourceFingerprint,
      operations: [{ kind: "replace-command", source: effect.source, expected: rawCommand, replacement }],
      preconditions: [{ kind: "source-fingerprint", expected: sourceFingerprint }],
      validation: [
        { kind: "reparse", source: effect.source },
        { kind: "topology-compare", source: effect.source, expectation: "outlier-absent" },
        { kind: "rerun-diagnostic", code: "TOPOLOGY_TRANSLATION_OUTLIER", source: effect.source, expectation: "absent" },
      ],
    }),
  };
}
