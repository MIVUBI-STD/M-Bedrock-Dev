import type {
  StructureFootprintCell,
} from "../../world-db/src/structure-residue.js";

export type StructureRotation = 0 | 90 | 180 | 270;
export type StructureMirror = "none" | "x" | "z" | "xz";

export interface StructurePlacementTransform {
  origin: { x: number; y: number; z: number };
  rotation?: StructureRotation;
  mirror?: StructureMirror;
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

  return cells.map((cell) => {
    const mirrored = mirror(cell.x, cell.z, mirrorMode);
    const rotated = rotate(
      mirrored.x,
      mirrored.z,
      rotation,
    );
    return {
      x: transform.origin.x + rotated.x,
      y: transform.origin.y + cell.y,
      z: transform.origin.z + rotated.z,
      mode: cell.mode,
    };
  });
}
