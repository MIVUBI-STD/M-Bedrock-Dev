import type { CommandEffect } from "../../../analyzers/commands/src/effects.js";
import type { LinearTopologyOutlier } from "../../../analyzers/topology/src/linear-outliers.js";
import { createPatchTransaction } from "./create.js";
import type { PatchTransaction } from "./types.js";

export interface TopologyRepairCandidate {
  outlier: LinearTopologyOutlier;
  effect: CommandEffect;
  rawCommand: string;
}

export type TopologyRepairPlanResult =
  | { status: "planned"; transaction: PatchTransaction }
  | { status: "unsupported"; reason: string };

function formatNumber(value: number): string {
  return String(value);
}

function absoluteValue(
  coordinate: { mode: "absolute" | "relative" | "local"; value: number },
): number | undefined {
  return coordinate.mode === "absolute" ? coordinate.value : undefined;
}

function planFillReplacement(
  effect: Extract<CommandEffect, { kind: "fill" }>,
  outlier: LinearTopologyOutlier,
): string | undefined {
  const fromX = absoluteValue(effect.region.from.x);
  const fromY = absoluteValue(effect.region.from.y);
  const fromZ = absoluteValue(effect.region.from.z);
  const toX = absoluteValue(effect.region.to.x);
  const toY = absoluteValue(effect.region.to.y);
  const toZ = absoluteValue(effect.region.to.z);
  if ([fromX, fromY, fromZ, toX, toY, toZ].some((value) => value === undefined)) {
    return undefined;
  }

  const delta = outlier.expectedCoordinate - outlier.actualCoordinate;
  const nextFromX = outlier.axis === "x" ? fromX! + delta : fromX!;
  const nextToX = outlier.axis === "x" ? toX! + delta : toX!;
  const nextFromZ = outlier.axis === "z" ? fromZ! + delta : fromZ!;
  const nextToZ = outlier.axis === "z" ? toZ! + delta : toZ!;

  return [
    "fill",
    formatNumber(nextFromX), formatNumber(fromY!), formatNumber(nextFromZ),
    formatNumber(nextToX), formatNumber(toY!), formatNumber(nextToZ),
    effect.block,
    ...(effect.mode ? [effect.mode] : []),
  ].join(" ");
}

function planSetblockReplacement(
  effect: Extract<CommandEffect, { kind: "setblock" }>,
  outlier: LinearTopologyOutlier,
): string | undefined {
  const x = absoluteValue(effect.position.x);
  const y = absoluteValue(effect.position.y);
  const z = absoluteValue(effect.position.z);
  if (x === undefined || y === undefined || z === undefined) return undefined;

  const delta = outlier.expectedCoordinate - outlier.actualCoordinate;
  return [
    "setblock",
    formatNumber(outlier.axis === "x" ? x + delta : x),
    formatNumber(y),
    formatNumber(outlier.axis === "z" ? z + delta : z),
    effect.block,
    ...(effect.mode ? [effect.mode] : []),
  ].join(" ");
}

export function planLinearTopologyRepair(
  candidate: TopologyRepairCandidate,
  sourceFingerprint: string,
): TopologyRepairPlanResult {
  const { effect, outlier, rawCommand } = candidate;

  if (effect.kind !== "fill" && effect.kind !== "setblock") {
    return {
      status: "unsupported",
      reason: "Only absolute fill and setblock outliers are currently eligible for automatic topology repair.",
    };
  }

  if (!effect.source.range?.lineStart || effect.source.range.lineStart !== effect.source.range.lineEnd) {
    return {
      status: "unsupported",
      reason: "Topology repair requires exact single-line source evidence.",
    };
  }

  const replacement = effect.kind === "fill"
    ? planFillReplacement(effect, outlier)
    : planSetblockReplacement(effect, outlier);

  if (!replacement || replacement === rawCommand) {
    return {
      status: "unsupported",
      reason: "A deterministic absolute-coordinate replacement could not be constructed.",
    };
  }

  return {
    status: "planned",
    transaction: createPatchTransaction({
      title: "repair linear topology coordinate outlier",
      sourceFingerprint,
      operations: [{
        kind: "replace-command",
        source: effect.source,
        expected: rawCommand,
        replacement,
      }],
      preconditions: [{
        kind: "source-fingerprint",
        expected: sourceFingerprint,
      }],
      validation: [
        { kind: "reparse", target: effect.source.relativePath },
        { kind: "topology-compare", target: outlier.sourcePath },
        { kind: "rerun-diagnostic", target: "TOPOLOGY_TRANSLATION_OUTLIER" },
      ],
    }),
  };
}
