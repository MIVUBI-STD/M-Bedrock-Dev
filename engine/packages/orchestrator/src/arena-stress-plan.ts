import {
  buildMultiplayerStressMatrix,
  type MultiplayerStressMatrix,
} from "../../reliability/src/index.js";
import type {
  ArenaSpatialLayout,
} from "../../../analyzers/topology/src/index.js";
import type {
  ArenaCapacityExtractionResult,
} from "./arena-capacity-extraction.js";

export interface ArenaStressPlan {
  status: "planned" | "unavailable";
  reasons: readonly string[];
  matrix?: MultiplayerStressMatrix;
}

export function deriveArenaStressPlan(
  layout: ArenaSpatialLayout | undefined,
  capacity: ArenaCapacityExtractionResult | undefined,
): ArenaStressPlan {
  if (!layout) {
    return {
      status: "unavailable",
      reasons: [
        "Arena spatial layout is unresolved; deterministic cross-arena stress scenarios cannot be scoped.",
      ],
    };
  }

  const playersPerArena =
    capacity?.evidence.perArenaPlayerCapacity;
  if (playersPerArena === undefined) {
    return {
      status: "unavailable",
      reasons: [
        "Per-arena player capacity is unresolved; stress planning will not assume a default player count.",
      ],
    };
  }

  const arenaIds = [
    layout.canonical.arenaId,
    ...layout.replicas.map(
      (replica) => replica.arenaId,
    ),
  ];

  return {
    status: "planned",
    reasons: [
      "Arena layout and per-arena player capacity are both evidence-backed.",
      "Stress matrix includes per-arena terminal cases and cross-arena overlap cases.",
    ],
    matrix: buildMultiplayerStressMatrix({
      arenaIds,
      playersPerArena,
    }),
  };
}
