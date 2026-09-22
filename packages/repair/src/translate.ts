import type { WorldPosition } from "../../../analyzers/topology/src/coordinate-context.js";
import type { Translation3 } from "../../../analyzers/topology/src/signature.js";

export function translateWorldPosition(
  position: WorldPosition,
  offset: Translation3,
): WorldPosition {
  return {
    x: position.x + offset.x,
    y: position.y + offset.y,
    z: position.z + offset.z,
  };
}

export function formatAbsolutePosition(position: WorldPosition): string {
  return `${position.x} ${position.y} ${position.z}`;
}
