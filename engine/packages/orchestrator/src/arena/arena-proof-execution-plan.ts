import type {
  ArenaNativeSpatialAudit,
} from "../arena-native-extraction.js";
import type {
  ArenaEntityPopulationProof,
} from "./arena-entity-population-proof.js";

export type ArenaProofExecutionMode =
  | "progressive"
  | "full";

export type ArenaProofLayer =
  | "native-spatial"
  | "voxel"
  | "block-entity"
  | "tick-state"
  | "actor-population";

export interface ArenaProofExecutionDecision {
  layer: ArenaProofLayer;
  action: "execute" | "skip";
  reason: string;
}

export interface ArenaProofExecutionPlan {
  mode: ArenaProofExecutionMode;
  decisions: readonly ArenaProofExecutionDecision[];
  executedLayers: readonly ArenaProofLayer[];
  skippedLayers: readonly ArenaProofLayer[];
}

export interface ArenaProofExecutionInput {
  mode?: ArenaProofExecutionMode;
  nativeSpatial?: ArenaNativeSpatialAudit;
  nativeObservationsTruncated?: boolean;
  blockEntityRecords: number;
  pendingTickRecords: number;
  randomTickRecords: number;
  actorRecords: number;
  authoredEntityProof?: ArenaEntityPopulationProof;
}

function nativeFullyMatches(
  input: ArenaProofExecutionInput,
): boolean {
  const native = input.nativeSpatial;
  return (
    native?.status === "chunk-record-proof" &&
    native.replicas.length > 0 &&
    native.replicas.every(
      (item) =>
        item.status === "chunk-record-proof" &&
        item.matchesCanonical === true,
    ) &&
    input.nativeObservationsTruncated !== true
  );
}

export function planArenaProofExecution(
  input: ArenaProofExecutionInput,
): ArenaProofExecutionPlan {
  const mode = input.mode ?? "progressive";
  const full = mode === "full";
  const nativeMatch = nativeFullyMatches(input);
  const decisions: ArenaProofExecutionDecision[] = [{
    layer: "native-spatial",
    action: "execute",
    reason:
      "Native chunk-record fingerprinting is the lowest-cost physical arena evidence layer.",
  }];

  decisions.push({
    layer: "voxel",
    action:
      full ||
      !nativeMatch ||
      input.nativeSpatial?.status === "voxel-proof-required"
        ? "execute"
        : "skip",
    reason:
      full
        ? "Full arena proof mode explicitly requests decoded voxel comparison."
        : nativeMatch
          ? "Normalized chunk-record evidence is complete and equal for every replica; progressive mode stops before expensive voxel decode."
          : "Native evidence is unavailable, truncated, mismatched, or requires coordinate-level proof.",
  });

  decisions.push({
    layer: "block-entity",
    action:
      input.blockEntityRecords === 0
        ? "skip"
        : full || !nativeMatch
          ? "execute"
          : "skip",
    reason:
      input.blockEntityRecords === 0
        ? "World DB scan found no block-entity records."
        : full
          ? "Full arena proof mode explicitly requests block-entity NBT comparison."
          : nativeMatch
            ? "Complete equal raw chunk-record evidence already includes block-entity record hashes; targeted NBT decode is deferred."
            : "Block-entity records exist and cheaper native evidence is not sufficient.",
  });

  decisions.push({
    layer: "tick-state",
    action:
      full ||
      input.pendingTickRecords > 0 ||
      input.randomTickRecords > 0
        ? "execute"
        : "skip",
    reason:
      full
        ? "Full arena proof mode includes queued tick-state comparison."
        : input.pendingTickRecords > 0 ||
            input.randomTickRecords > 0
          ? "Pending/random tick records exist and are compared from already-scanned metadata."
          : "No pending/random tick records were observed.",
  });

  decisions.push({
    layer: "actor-population",
    action:
      input.actorRecords === 0
        ? "skip"
        : full ||
            input.authoredEntityProof?.status === "diverged"
          ? "execute"
          : "skip",
    reason:
      input.actorRecords === 0
        ? "World DB scan found no Actor records."
        : full
          ? "Full arena proof mode explicitly requests runtime Actor population comparison."
          : input.authoredEntityProof?.status === "diverged"
            ? "Authored entity population already diverged, so Actor DB comparison is an evidence escalation."
            : "Actor DB scanning is very expensive and runtime population can legitimately vary; progressive mode defers it until entity evidence requires escalation.",
  });

  return {
    mode,
    decisions,
    executedLayers: decisions
      .filter((item) => item.action === "execute")
      .map((item) => item.layer),
    skippedLayers: decisions
      .filter((item) => item.action === "skip")
      .map((item) => item.layer),
  };
}

export function arenaProofLayerEnabled(
  plan: ArenaProofExecutionPlan,
  layer: ArenaProofLayer,
): boolean {
  return plan.decisions.some(
    (item) =>
      item.layer === layer &&
      item.action === "execute",
  );
}
