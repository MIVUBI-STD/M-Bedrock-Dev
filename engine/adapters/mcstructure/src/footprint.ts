import {
  flatIndexToCoordinate,
  validateStructureLayerLengths,
} from "./indexing.js";
import {
  placedWorldCoordinate,
  type StructurePlacementTransform,
} from "./placement-transform.js";
import type {
  McStructureModel,
  StructureCoordinate,
} from "./types.js";

export type McStructureFootprintMode =
  | "replace"
  | "air"
  | "void";

export interface McStructureFootprintCell
  extends StructureCoordinate {
  mode: McStructureFootprintMode;
  paletteIndex: number;
  blockName: string;
}

export interface McStructureFootprint {
  cells: readonly McStructureFootprintCell[];
  unknownPrimaryCells: number;
}

export interface PlacedMcStructureFootprint
  extends McStructureFootprint {
  origin: StructureCoordinate;
  transform: StructurePlacementTransform;
}

export function extractMcStructureFootprint(
  structure: McStructureModel,
): McStructureFootprint {
  if (!structure.size) {
    throw new Error(
      "mcstructure footprint requires declared structure size.",
    );
  }

  const validation =
    validateStructureLayerLengths(structure);
  if (!validation.ok) {
    throw new Error(
      "mcstructure footprint requires valid block index layer lengths.",
    );
  }

  const primary =
    structure.blockIndexLayers.find(
      (layer) => layer.layer === 0,
    );
  if (!primary) {
    return {
      cells: [],
      unknownPrimaryCells: 0,
    };
  }

  const palette = new Map(
    structure.palette.map((entry) => [
      entry.index,
      entry,
    ]),
  );
  const cells: McStructureFootprintCell[] = [];
  let unknownPrimaryCells = 0;

  primary.indices.forEach(
    (paletteIndex, flatIndex) => {
      if (paletteIndex < 0) {
        unknownPrimaryCells += 1;
        return;
      }

      const coordinate =
        flatIndexToCoordinate(
          flatIndex,
          structure.size!,
        );
      const entry =
        palette.get(paletteIndex);
      const blockName = entry?.name;

      if (!coordinate || !blockName) {
        unknownPrimaryCells += 1;
        return;
      }

      cells.push({
        ...coordinate,
        paletteIndex,
        blockName,
        mode:
          blockName === "minecraft:structure_void"
            ? "void"
            : blockName === "minecraft:air"
              ? "air"
              : "replace",
      });
    },
  );

  return {
    cells,
    unknownPrimaryCells,
  };
}

export function placeMcStructureFootprint(
  structure: McStructureModel,
  origin: StructureCoordinate,
  transform: StructurePlacementTransform = {},
): PlacedMcStructureFootprint {
  if (!structure.size) {
    throw new Error(
      "mcstructure placement requires declared structure size.",
    );
  }

  const local =
    extractMcStructureFootprint(structure);

  return {
    origin,
    transform,
    unknownPrimaryCells:
      local.unknownPrimaryCells,
    cells: local.cells.map((cell) => ({
      ...placedWorldCoordinate(
        cell,
        structure.size!,
        origin,
        transform,
      ),
      mode: cell.mode,
      paletteIndex: cell.paletteIndex,
      blockName: cell.blockName,
    })),
  };
}
