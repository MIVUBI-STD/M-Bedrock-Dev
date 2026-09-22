import type { CommandEffect } from "../../commands/src/effects.js";
import type { BlockRegion } from "../../commands/src/coordinates.js";
import { resolveCoordinate3, type CoordinateContext, type WorldPosition } from "./coordinate-context.js";

export type ResolvedEffect =
  | { kind: "fill"; from: WorldPosition; to: WorldPosition; block: string; sourcePath: string }
  | { kind: "setblock"; position: WorldPosition; block: string; sourcePath: string }
  | { kind: "clone"; from: WorldPosition; to: WorldPosition; destination: WorldPosition; sourcePath: string }
  | { kind: "teleport"; target: string; destination: WorldPosition; sourcePath: string };

function resolveRegion(region: BlockRegion, context: CoordinateContext) {
  const from = resolveCoordinate3(region.from, context);
  const to = resolveCoordinate3(region.to, context);
  return from && to ? { from, to } : undefined;
}

export function resolveEffect(
  effect: CommandEffect,
  context: CoordinateContext,
): ResolvedEffect | undefined {
  if (effect.kind === "fill") {
    const region = resolveRegion(effect.region, context);
    return region ? { kind: "fill", ...region, block: effect.block, sourcePath: effect.source.relativePath } : undefined;
  }
  if (effect.kind === "setblock") {
    const position = resolveCoordinate3(effect.position, context);
    return position ? { kind: "setblock", position, block: effect.block, sourcePath: effect.source.relativePath } : undefined;
  }
  if (effect.kind === "clone") {
    const region = resolveRegion(effect.sourceRegion, context);
    const destination = resolveCoordinate3(effect.destination, context);
    return region && destination ? { kind: "clone", ...region, destination, sourcePath: effect.source.relativePath } : undefined;
  }
  if (effect.kind === "teleport") {
    const destination = resolveCoordinate3(effect.destination, context);
    return destination ? { kind: "teleport", target: effect.target, destination, sourcePath: effect.source.relativePath } : undefined;
  }
  return undefined;
}
