import type { BlockVolume } from "./route-corridor.js";
import type { SourceRef } from "../project/source-ref.js";

export type ArenaRegionContractRole =
  | "static"
  | "mutable"
  | "ignore";

export type ArenaRegionCoordinateSpace =
  | "absolute"
  | "canonical-relative";

export interface ArenaRegionContract {
  id: string;
  role: ArenaRegionContractRole;
  coordinateSpace: ArenaRegionCoordinateSpace;
  volume: BlockVolume;
  purpose?: string;
  sourceRefs?: readonly SourceRef[];
}

export function resolveArenaRegionContractVolume(
  contract: ArenaRegionContract,
  canonicalAnchor: { x: number; y: number; z: number },
): BlockVolume {
  if (contract.coordinateSpace === "absolute") {
    return contract.volume;
  }

  return {
    min: {
      x: canonicalAnchor.x + contract.volume.min.x,
      y: canonicalAnchor.y + contract.volume.min.y,
      z: canonicalAnchor.z + contract.volume.min.z,
    },
    max: {
      x: canonicalAnchor.x + contract.volume.max.x,
      y: canonicalAnchor.y + contract.volume.max.y,
      z: canonicalAnchor.z + contract.volume.max.z,
    },
  };
}
