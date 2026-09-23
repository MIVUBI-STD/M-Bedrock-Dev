import type { StructureCoordinate } from "./types.js";
import type { EmbeddedCommandBlock } from "./runtime-content.js";

const FACING_VECTORS: Record<number, StructureCoordinate> = {
  0: { x: 0, y: -1, z: 0 },
  1: { x: 0, y: 1, z: 0 },
  2: { x: 0, y: 0, z: -1 },
  3: { x: 0, y: 0, z: 1 },
  4: { x: -1, y: 0, z: 0 },
  5: { x: 1, y: 0, z: 0 },
};

function key(position: StructureCoordinate): string {
  return `${position.x},${position.y},${position.z}`;
}

function add(
  left: StructureCoordinate,
  right: StructureCoordinate,
): StructureCoordinate {
  return {
    x: left.x + right.x,
    y: left.y + right.y,
    z: left.z + right.z,
  };
}

export interface CommandChainEdge {
  fromFlatIndex: number;
  toFlatIndex: number;
}

export interface CommandChainIssue {
  kind:
    | "missing-facing-direction"
    | "conditional-without-predecessor"
    | "chain-without-predecessor";
  flatIndex: number;
}

export interface CommandChainAnalysis {
  edges: CommandChainEdge[];
  issues: CommandChainIssue[];
}

export function analyzeCommandBlockChains(
  blocks: readonly EmbeddedCommandBlock[],
): CommandChainAnalysis {
  const byPosition = new Map<string, EmbeddedCommandBlock>();
  for (const block of blocks) {
    if (block.coordinate) byPosition.set(key(block.coordinate), block);
  }

  const edges: CommandChainEdge[] = [];
  const incoming = new Set<number>();
  const issues: CommandChainIssue[] = [];

  for (const block of blocks) {
    if (!block.coordinate) continue;
    if (block.facingDirection === undefined) {
      issues.push({ kind: "missing-facing-direction", flatIndex: block.flatIndex });
      continue;
    }

    const vector = FACING_VECTORS[block.facingDirection];
    if (!vector) {
      issues.push({ kind: "missing-facing-direction", flatIndex: block.flatIndex });
      continue;
    }

    const next = byPosition.get(key(add(block.coordinate, vector)));
    if (!next || next.paletteName !== "minecraft:chain_command_block") continue;

    edges.push({
      fromFlatIndex: block.flatIndex,
      toFlatIndex: next.flatIndex,
    });
    incoming.add(next.flatIndex);
  }

  for (const block of blocks) {
    if (block.paletteName !== "minecraft:chain_command_block") continue;
    if (incoming.has(block.flatIndex)) continue;

    issues.push({
      kind: block.conditional === true
        ? "conditional-without-predecessor"
        : "chain-without-predecessor",
      flatIndex: block.flatIndex,
    });
  }

  return {
    edges: edges.sort((a, b) =>
      a.fromFlatIndex - b.fromFlatIndex ||
      a.toFlatIndex - b.toFlatIndex
    ),
    issues: issues.sort((a, b) =>
      a.flatIndex - b.flatIndex ||
      a.kind.localeCompare(b.kind)
    ),
  };
}
