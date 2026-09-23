import { flatIndexToCoordinate } from "./indexing.js";
import type { McStructureModel, StructureCoordinate } from "./types.js";

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function boolish(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (value === 0) return false;
  if (value === 1) return true;
  return undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

export interface EmbeddedCommandBlock {
  flatIndex: number;
  coordinate?: StructureCoordinate;
  paletteName?: string;
  paletteStates?: Readonly<Record<string, unknown>>;
  facingDirection?: number;
  blockEntityId?: string;
  command: string;
  customName?: string;
  auto?: boolean;
  conditional?: boolean;
  powered?: boolean;
  executeOnFirstTick?: boolean;
  tickDelay?: number;
  trackOutput?: boolean;
}

export interface StructureRuntimeContent {
  commandBlocks: EmbeddedCommandBlock[];
  queuedTickPositions: number;
}

function paletteEntryAt(
  structure: McStructureModel,
  flatIndex: number,
) {
  const layer = structure.blockIndexLayers.find((item) => item.layer === 0);
  const paletteIndex = layer?.indices[flatIndex];
  if (paletteIndex === undefined || paletteIndex < 0) return undefined;
  return structure.palette[paletteIndex];
}

function isCommandBlockPalette(name: string | undefined): boolean {
  return name === "minecraft:command_block" ||
    name === "minecraft:chain_command_block" ||
    name === "minecraft:repeating_command_block";
}

function queuedTickCount(value: unknown): number {
  const record = asRecord(value);
  if (!record) return 0;
  const ticks = record.tick_queue_data;
  if (Array.isArray(ticks)) return ticks.length;
  return asRecord(ticks) ? Object.keys(asRecord(ticks)!).length : 0;
}

export function extractStructureRuntimeContent(
  structure: McStructureModel,
): StructureRuntimeContent {
  const positionData = asRecord(structure.blockPositionData);
  if (!positionData) return { commandBlocks: [], queuedTickPositions: 0 };

  const commandBlocks: EmbeddedCommandBlock[] = [];
  let queuedTickPositions = 0;

  for (const [indexText, value] of Object.entries(positionData)) {
    const flatIndex = Number(indexText);
    if (!Number.isInteger(flatIndex) || flatIndex < 0) continue;

    const positionRecord = asRecord(value);
    if (!positionRecord) continue;
    if (queuedTickCount(positionRecord) > 0) queuedTickPositions += 1;

    const blockEntity = asRecord(positionRecord.block_entity_data);
    if (!blockEntity || typeof blockEntity.Command !== "string") continue;

    const paletteEntry = paletteEntryAt(structure, flatIndex);
    const paletteName = paletteEntry?.name;
    const paletteStates = paletteEntry?.states;
    const facingDirection = typeof paletteStates?.facing_direction === "number"
      ? paletteStates.facing_direction
      : undefined;
    const blockEntityId =
      typeof blockEntity.id === "string" ? blockEntity.id : undefined;

    if (
      !isCommandBlockPalette(paletteName) &&
      blockEntityId !== "CommandBlock"
    ) continue;

    const coordinate = structure.size
      ? flatIndexToCoordinate(flatIndex, structure.size)
      : undefined;
    const auto = boolish(blockEntity.auto);
    const conditional =
      (typeof paletteStates?.conditional_bit === "boolean"
        ? paletteStates.conditional_bit
        : undefined) ??
      boolish(blockEntity.LPConditionalMode) ??
      boolish(blockEntity.conditionalMode);
    const powered = boolish(blockEntity.powered);
    const executeOnFirstTick = boolish(blockEntity.ExecuteOnFirstTick);
    const tickDelay = numberValue(blockEntity.TickDelay);
    const trackOutput = boolish(blockEntity.TrackOutput);

    commandBlocks.push({
      flatIndex,
      ...(coordinate ? { coordinate } : {}),
      ...(paletteName ? { paletteName } : {}),
      ...(paletteStates ? { paletteStates } : {}),
      ...(facingDirection !== undefined ? { facingDirection } : {}),
      ...(blockEntityId ? { blockEntityId } : {}),
      command: blockEntity.Command,
      ...(typeof blockEntity.CustomName === "string"
        ? { customName: blockEntity.CustomName }
        : {}),
      ...(auto !== undefined ? { auto } : {}),
      ...(conditional !== undefined ? { conditional } : {}),
      ...(powered !== undefined ? { powered } : {}),
      ...(executeOnFirstTick !== undefined ? { executeOnFirstTick } : {}),
      ...(tickDelay !== undefined ? { tickDelay } : {}),
      ...(trackOutput !== undefined ? { trackOutput } : {}),
    });
  }

  commandBlocks.sort((a, b) => a.flatIndex - b.flatIndex);

  return { commandBlocks, queuedTickPositions };
}
