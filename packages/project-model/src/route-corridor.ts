import type { SourceRef } from "./source-ref.js";

export interface BlockVolume {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

export interface RouteCorridorContract {
  id: string;
  dimension?: string;
  volume: BlockVolume;
  sourceRefs?: readonly SourceRef[];
  tags?: readonly string[];
  purpose?: string;
}

export function normalizeBlockVolume(volume: BlockVolume): BlockVolume {
  return {
    min: {
      x: Math.min(volume.min.x, volume.max.x),
      y: Math.min(volume.min.y, volume.max.y),
      z: Math.min(volume.min.z, volume.max.z),
    },
    max: {
      x: Math.max(volume.min.x, volume.max.x),
      y: Math.max(volume.min.y, volume.max.y),
      z: Math.max(volume.min.z, volume.max.z),
    },
  };
}

export function blockVolumesOverlap(a: BlockVolume, b: BlockVolume): boolean {
  const left = normalizeBlockVolume(a);
  const right = normalizeBlockVolume(b);
  return !(
    left.max.x < right.min.x ||
    right.max.x < left.min.x ||
    left.max.y < right.min.y ||
    right.max.y < left.min.y ||
    left.max.z < right.min.z ||
    right.max.z < left.min.z
  );
}
