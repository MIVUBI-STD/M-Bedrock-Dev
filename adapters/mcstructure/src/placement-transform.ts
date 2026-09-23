import type { StructureCoordinate, StructureSize } from "./types.js";

export type StructureRotation =
  | "none"
  | "0_degrees"
  | "90_degrees"
  | "180_degrees"
  | "270_degrees";

export type StructureMirror = "none" | "x" | "z" | "xz";

export interface StructurePlacementTransform {
  rotation?: StructureRotation;
  mirror?: StructureMirror;
}

function mirrorLocal(
  coordinate: StructureCoordinate,
  size: StructureSize,
  mirror: StructureMirror,
): StructureCoordinate {
  return {
    x: mirror === "x" || mirror === "xz"
      ? size.x - 1 - coordinate.x
      : coordinate.x,
    y: coordinate.y,
    z: mirror === "z" || mirror === "xz"
      ? size.z - 1 - coordinate.z
      : coordinate.z,
  };
}

function rotateLocal(
  coordinate: StructureCoordinate,
  size: StructureSize,
  rotation: StructureRotation,
): StructureCoordinate {
  if (rotation === "90_degrees") {
    return {
      x: size.z - 1 - coordinate.z,
      y: coordinate.y,
      z: coordinate.x,
    };
  }
  if (rotation === "180_degrees") {
    return {
      x: size.x - 1 - coordinate.x,
      y: coordinate.y,
      z: size.z - 1 - coordinate.z,
    };
  }
  if (rotation === "270_degrees") {
    return {
      x: coordinate.z,
      y: coordinate.y,
      z: size.x - 1 - coordinate.x,
    };
  }
  return coordinate;
}

export function transformStructureCoordinate(
  coordinate: StructureCoordinate,
  size: StructureSize,
  transform: StructurePlacementTransform,
): StructureCoordinate {
  const mirrored = mirrorLocal(
    coordinate,
    size,
    transform.mirror ?? "none",
  );
  return rotateLocal(
    mirrored,
    size,
    transform.rotation ?? "none",
  );
}

export function placedWorldCoordinate(
  local: StructureCoordinate,
  size: StructureSize,
  origin: StructureCoordinate,
  transform: StructurePlacementTransform,
): StructureCoordinate {
  const transformed = transformStructureCoordinate(local, size, transform);
  return {
    x: origin.x + transformed.x,
    y: origin.y + transformed.y,
    z: origin.z + transformed.z,
  };
}
