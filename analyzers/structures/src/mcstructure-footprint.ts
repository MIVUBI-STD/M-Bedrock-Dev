import * as nbt from "prismarine-nbt";
import type {
  StructureFootprintCell,
} from "../../world-db/src/structure-residue.js";

export interface McstructurePaletteEntry {
  name: string;
  states?: Readonly<Record<string, unknown>>;
}

export interface McstructureFootprint {
  size: readonly [number, number, number];
  origin: readonly [number, number, number];
  cells: readonly StructureFootprintCell[];
  palette: readonly McstructurePaletteEntry[];
  unknownPrimaryCells: number;
}

function numberArray(
  value: unknown,
  expectedLength: number,
): number[] | undefined {
  if (
    Array.isArray(value) ||
    ArrayBuffer.isView(value)
  ) {
    const output = Array.from(value as ArrayLike<unknown>)
      .map(Number);
    if (
      output.length === expectedLength &&
      output.every(Number.isFinite)
    ) {
      return output;
    }
  }
  return undefined;
}

function object(
  value: unknown,
): Record<string, unknown> | undefined {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  )
    ? value as Record<string, unknown>
    : undefined;
}

function paletteEntries(
  root: Record<string, unknown>,
): McstructurePaletteEntry[] {
  const structure = object(root.structure);
  const palette = object(structure?.palette);
  const defaultPalette = object(palette?.default);
  const raw = defaultPalette?.block_palette;
  if (!Array.isArray(raw)) return [];

  return raw.map((entry) => {
    const item = object(entry) ?? {};
    return {
      name:
        typeof item.name === "string"
          ? item.name
          : "minecraft:air",
      ...(object(item.states)
        ? { states: object(item.states)! }
        : {}),
    };
  });
}

function blockIndices(
  root: Record<string, unknown>,
): readonly number[][] {
  const structure = object(root.structure);
  const raw = structure?.block_indices;
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((layer) => {
    if (
      !Array.isArray(layer) &&
      !ArrayBuffer.isView(layer)
    ) {
      return [];
    }
    const values = Array.from(
      layer as ArrayLike<unknown>,
    ).map(Number);
    return values.every(Number.isFinite)
      ? [values]
      : [];
  });
}

function coordinateForIndex(
  index: number,
  size: readonly [number, number, number],
): { x: number; y: number; z: number } {
  const [sx, sy] = size;
  const x = index % sx;
  const y = Math.floor(index / sx) % sy;
  const z = Math.floor(index / (sx * sy));
  return { x, y, z };
}

export function extractMcstructureFootprintFromSimplifiedNbt(
  simplified: unknown,
): McstructureFootprint {
  const root = object(simplified);
  if (!root) {
    throw new Error("mcstructure root must be an object.");
  }

  const sizeValue = numberArray(root.size, 3);
  if (!sizeValue) {
    throw new Error("mcstructure size must contain exactly three numbers.");
  }
  const size = sizeValue as [number, number, number];
  if (
    size.some(
      (value) =>
        !Number.isInteger(value) ||
        value <= 0,
    )
  ) {
    throw new Error("mcstructure size values must be positive integers.");
  }

  const originValue =
    numberArray(root.structure_world_origin, 3) ??
    [0, 0, 0];
  const origin =
    originValue as [number, number, number];
  const palette = paletteEntries(root);
  const layers = blockIndices(root);
  const cellCount =
    size[0] * size[1] * size[2];

  const primary = layers[0] ?? [];
  if (
    primary.length > 0 &&
    primary.length !== cellCount
  ) {
    throw new Error(
      "mcstructure primary block index count does not match declared size.",
    );
  }

  const cells: StructureFootprintCell[] = [];
  let unknownPrimaryCells = 0;

  for (let index = 0; index < primary.length; index += 1) {
    const paletteIndex = primary[index]!;
    const coordinate =
      coordinateForIndex(index, size);

    if (paletteIndex < 0) {
      unknownPrimaryCells += 1;
      continue;
    }

    const blockName =
      palette[paletteIndex]?.name;
    if (!blockName) {
      unknownPrimaryCells += 1;
      continue;
    }

    cells.push({
      ...coordinate,
      mode:
        blockName === "minecraft:structure_void"
          ? "void"
          : blockName === "minecraft:air"
            ? "air"
            : "replace",
    });
  }

  return {
    size,
    origin,
    cells,
    palette,
    unknownPrimaryCells,
  };
}

export async function parseMcstructureFootprint(
  bytes: Uint8Array,
): Promise<McstructureFootprint> {
  const parsed = await nbt.parseUncompressed(
    Buffer.from(bytes),
    "little",
  );
  const simplified = nbt.simplify(parsed);
  return extractMcstructureFootprintFromSimplifiedNbt(
    simplified,
  );
}
