import type { Coordinate3, CoordinateValue } from "../../commands/src/coordinates.js";

export interface WorldPosition {
  x: number;
  y: number;
  z: number;
}

export interface CoordinateContext {
  origin: WorldPosition;
  localBasis?: {
    left: WorldPosition;
    up: WorldPosition;
    forward: WorldPosition;
  };
}

function resolveAxis(value: CoordinateValue, origin: number): number | undefined {
  if (value.mode === "absolute") return value.value;
  if (value.mode === "relative") return origin + value.value;
  return undefined;
}

export function resolveCoordinate3(
  coordinate: Coordinate3,
  context: CoordinateContext,
): WorldPosition | undefined {
  const x = resolveAxis(coordinate.x, context.origin.x);
  const y = resolveAxis(coordinate.y, context.origin.y);
  const z = resolveAxis(coordinate.z, context.origin.z);

  if (x !== undefined && y !== undefined && z !== undefined) {
    return { x, y, z };
  }

  if (
    coordinate.x.mode !== "local" ||
    coordinate.y.mode !== "local" ||
    coordinate.z.mode !== "local" ||
    !context.localBasis
  ) {
    return undefined;
  }

  const { left, up, forward } = context.localBasis;
  return {
    x: context.origin.x + left.x * coordinate.x.value + up.x * coordinate.y.value + forward.x * coordinate.z.value,
    y: context.origin.y + left.y * coordinate.x.value + up.y * coordinate.y.value + forward.y * coordinate.z.value,
    z: context.origin.z + left.z * coordinate.x.value + up.z * coordinate.y.value + forward.z * coordinate.z.value,
  };
}
