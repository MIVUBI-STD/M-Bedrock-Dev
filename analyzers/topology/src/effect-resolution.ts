import type { CommandEffect } from "../../commands/src/effects.js";
import type { BlockRegion, Coordinate3 } from "../../commands/src/coordinates.js";
import { resolveCoordinate3, type CoordinateContext, type WorldPosition } from "./coordinate-context.js";

export type ResolvedEffect =
  | { kind: "fill"; from: WorldPosition; to: WorldPosition; block: string; sourcePath: string }
  | { kind: "setblock"; position: WorldPosition; block: string; sourcePath: string }
  | { kind: "clone"; from: WorldPosition; to: WorldPosition; destination: WorldPosition; sourcePath: string }
  | { kind: "teleport"; target: string; destination: WorldPosition; sourcePath: string }
  | { kind: "entity-spawn"; entityIdentifier: string; position: WorldPosition; sourcePath: string };

function resolveRegion(region: BlockRegion, context: CoordinateContext) {
  const from = resolveCoordinate3(region.from, context);
  const to = resolveCoordinate3(region.to, context);
  return from && to ? { from, to } : undefined;
}

function coordinateIsAbsolute(coordinate: Coordinate3): boolean {
  return coordinate.x.mode === "absolute"
    && coordinate.y.mode === "absolute"
    && coordinate.z.mode === "absolute";
}

export function effectUsesOnlyAbsoluteCoordinates(effect: CommandEffect): boolean {
  if (effect.kind === "fill") {
    return coordinateIsAbsolute(effect.region.from) && coordinateIsAbsolute(effect.region.to);
  }
  if (effect.kind === "setblock") return coordinateIsAbsolute(effect.position);
  if (effect.kind === "clone") {
    return coordinateIsAbsolute(effect.sourceRegion.from)
      && coordinateIsAbsolute(effect.sourceRegion.to)
      && coordinateIsAbsolute(effect.destination);
  }
  if (effect.kind === "teleport") return coordinateIsAbsolute(effect.destination);
  if (effect.kind === "entity-spawn") {
    return effect.position !== undefined &&
      coordinateIsAbsolute(effect.position);
  }
  return false;
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
