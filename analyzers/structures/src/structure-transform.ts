import type {
  StructureFootprintCell,
} from "../../world-db/src/structure-residue.js";

export type StructureRotation = 0 | 90 | 180 | 270;
export type StructureMirror = "none" | "x" | "z" | "xz";
export type StructureTransformPivot =
  | { kind: "local-origin" }
  | {
      kind: "explicit";
      x: number;
      z: number;
    }
  | {
      kind: "bounds-center";
      sizeX: number;
      sizeZ: number;
    };

export interface StructurePlacementTransform {
  origin: { x: number; y: number; z: number };
  rotation?: StructureRotation;
  mirror?: StructureMirror;
  pivot?: StructureTransformPivot;
}

function pivotPoint(
  pivot: StructureTransformPivot,
): { x: number; z: number } {
  if (pivot.kind === "explicit") {
    return { x: pivot.x, z: pivot.z };
  }
  if (pivot.kind === "bounds-center") {
    if (
      !Number.isInteger(pivot.sizeX) ||
      !Number.isInteger(pivot.sizeZ) ||
      pivot.sizeX <= 0 ||
      pivot.sizeZ <= 0
    ) {
      throw new Error(
        "Structure bounds-center pivot requires positive integer sizeX/sizeZ.",
      );
    }
    return {
      x: (pivot.sizeX - 1) / 2,
      z: (pivot.sizeZ - 1) / 2,
    };
  }
  return { x: 0, z: 0 };
}

function mirror(
  x: number,
  z: number,
  mode: StructureMirror,
): { x: number; z: number } {
  return {
    x: mode === "x" || mode === "xz" ? -x : x,
    z: mode === "z" || mode === "xz" ? -z : z,
  };
}

function rotate(
  x: number,
  z: number,
  rotation: StructureRotation,
): { x: number; z: number } {
  if (rotation === 90) return { x: -z, z: x };
  if (rotation === 180) return { x: -x, z: -z };
  if (rotation === 270) return { x: z, z: -x };
  return { x, z };
}

export function transformStructureFootprint(
  cells: readonly StructureFootprintCell[],
  transform: StructurePlacementTransform,
): StructureFootprintCell[] {
  const rotation = transform.rotation ?? 0;
  const mirrorMode = transform.mirror ?? "none";
  const pivot = pivotPoint(
    transform.pivot ?? { kind: "local-origin" },
  );

  return cells.map((cell) => {
    const localX = cell.x - pivot.x;
    const localZ = cell.z - pivot.z;
    const mirrored = mirror(
      localX,
      localZ,
      mirrorMode,
    );
    const rotated = rotate(
      mirrored.x,
      mirrored.z,
      rotation,
    );
    const worldX =
      transform.origin.x + rotated.x + pivot.x;
    const worldZ =
      transform.origin.z + rotated.z + pivot.z;

    if (
      !Number.isInteger(worldX) ||
      !Number.isInteger(worldZ)
    ) {
      throw new Error(
        "Structure transform produced a non-integer block coordinate; the selected pivot is incompatible with this quarter-turn transform.",
      );
    }

    return {
      x: worldX,
      y: transform.origin.y + cell.y,
      z: worldZ,
      mode: cell.mode,
    };
  });
}
