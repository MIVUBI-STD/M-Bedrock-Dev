import type { ParsedNbtDocument } from "../../nbt/src/index.js";
import type { WorldPosition } from "../../../packages/common/src/index.js";

export interface StructureSize {
  x: number;
  y: number;
  z: number;
}

export interface StructurePaletteEntry {
  index: number;
  name?: string;
  states?: Readonly<Record<string, unknown>>;
  raw: unknown;
}

export interface StructureBlockIndexLayer {
  layer: number;
  indices: readonly number[];
}

export interface McStructureModel {
  sourceName?: string;
  formatVersion?: number;
  size?: StructureSize;
  worldOrigin?: WorldPosition;
  palette: StructurePaletteEntry[];
  blockIndexLayers: StructureBlockIndexLayer[];
  entities: readonly unknown[];
  blockPositionData?: unknown;
  rawSimplified: unknown;
  nbt: ParsedNbtDocument;
}

export interface StructureCoordinate {
  x: number;
  y: number;
  z: number;
}
