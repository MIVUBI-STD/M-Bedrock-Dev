import type {
  SpatialCoordinate,
} from "./spatial-fingerprint.js";

export type StructureCellMode =
  | "replace"
  | "void"
  | "air";

export interface StructureFootprintCell extends SpatialCoordinate {
  mode: StructureCellMode;
}

export interface StructureResidueEvidence {
  coordinate: SpatialCoordinate;
  previousMode: StructureCellMode;
  nextMode: StructureCellMode;
  classification: "preserved-by-void" | "explicitly-cleared" | "replaced";
}

export interface StructureResidueReport {
  preservedByVoid: number;
  explicitlyCleared: number;
  replaced: number;
  evidence: readonly StructureResidueEvidence[];
}

function key(point: SpatialCoordinate): string {
  return [point.x, point.y, point.z].join(",");
}

export function analyzeStructureResidue(
  previous: readonly StructureFootprintCell[],
  next: readonly StructureFootprintCell[],
): StructureResidueReport {
  const previousByKey = new Map(previous.map((cell) => [key(cell), cell]));
  const evidence: StructureResidueEvidence[] = [];

  for (const cell of next) {
    const before = previousByKey.get(key(cell));
    if (!before || before.mode === "void") continue;

    const classification =
      cell.mode === "void"
        ? "preserved-by-void"
        : cell.mode === "air"
          ? "explicitly-cleared"
          : "replaced";

    evidence.push({
      coordinate: { x: cell.x, y: cell.y, z: cell.z },
      previousMode: before.mode,
      nextMode: cell.mode,
      classification,
    });
  }

  return {
    preservedByVoid: evidence.filter(
      (item) => item.classification === "preserved-by-void",
    ).length,
    explicitlyCleared: evidence.filter(
      (item) => item.classification === "explicitly-cleared",
    ).length,
    replaced: evidence.filter(
      (item) => item.classification === "replaced",
    ).length,
    evidence,
  };
}
