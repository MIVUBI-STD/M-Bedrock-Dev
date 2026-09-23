import { tokenizeCommand } from "./tokenize.js";

export interface StructureLoadSemantics {
  name: string;
  rotation?: string;
  mirror?: string;
  animationMode?: string;
  animationSeconds?: number;
  includeEntities?: boolean;
  includeBlocks?: boolean;
  waterlogged?: boolean;
  integrity?: number;
  seed?: string;
}

function asBoolean(value: string | undefined): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function asNumber(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

const ROTATIONS = new Set(["0_degrees", "90_degrees", "180_degrees", "270_degrees", "none"]);
const MIRRORS = new Set(["none", "x", "z", "xz"]);
const ANIMATIONS = new Set(["none", "block_by_block", "layer_by_layer"]);

export function parseStructureLoadSemantics(
  command: string,
): StructureLoadSemantics | undefined {
  const tokens = tokenizeCommand(command);
  if (
    tokens[0]?.toLowerCase() !== "structure" ||
    tokens[1]?.toLowerCase() !== "load" ||
    !tokens[2]
  ) return undefined;

  let index = 6;
  const result: StructureLoadSemantics = { name: tokens[2] };

  if (ROTATIONS.has(tokens[index] ?? "")) result.rotation = tokens[index++]!;
  if (MIRRORS.has(tokens[index] ?? "")) result.mirror = tokens[index++]!;

  if (ANIMATIONS.has(tokens[index] ?? "")) {
    result.animationMode = tokens[index++]!;
    const seconds = asNumber(tokens[index]);
    if (seconds !== undefined) {
      result.animationSeconds = seconds;
      index += 1;
    }
  }

  const includeEntities = asBoolean(tokens[index]);
  if (includeEntities !== undefined) {
    result.includeEntities = includeEntities;
    index += 1;
  }

  const includeBlocks = asBoolean(tokens[index]);
  if (includeBlocks !== undefined) {
    result.includeBlocks = includeBlocks;
    index += 1;
  }

  const waterlogged = asBoolean(tokens[index]);
  if (waterlogged !== undefined) {
    result.waterlogged = waterlogged;
    index += 1;
  }

  const integrity = asNumber(tokens[index]);
  if (integrity !== undefined) {
    result.integrity = integrity;
    index += 1;
  }

  if (tokens[index]) result.seed = tokens[index];

  return result;
}
