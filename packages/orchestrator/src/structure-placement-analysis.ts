import type { Coordinate3 } from "../../../analyzers/commands/src/coordinates.js";
import type { McStructureSemantics } from "../../../adapters/mcstructure/src/index.js";
import type {
  StructureCoordinate,
  StructureSize,
} from "../../../adapters/mcstructure/src/index.js";
import {
  placedWorldCoordinate,
  type StructureMirror,
  type StructureRotation,
} from "../../../adapters/mcstructure/src/index.js";
import type { EmbeddedCommandBlock } from "../../../adapters/mcstructure/src/index.js";

function absolute(
  coordinate: Coordinate3 | undefined,
): StructureCoordinate | undefined {
  if (!coordinate) return undefined;
  if (
    coordinate.x.mode !== "absolute" ||
    coordinate.y.mode !== "absolute" ||
    coordinate.z.mode !== "absolute"
  ) return undefined;
  return {
    x: coordinate.x.value,
    y: coordinate.y.value,
    z: coordinate.z.value,
  };
}

export interface StructurePlacementCommandWorldState {
  flatIndex: number;
  local: StructureCoordinate;
  world: StructureCoordinate;
  command: string;
  confidence: "inferred-transform";
}

export function derivePlacedEmbeddedCommands(
  load: {
    position?: Coordinate3;
    rotation?: string;
    mirror?: string;
  },
  size: StructureSize | undefined,
  commands: readonly EmbeddedCommandBlock[],
): StructurePlacementCommandWorldState[] {
  const origin = absolute(load.position);
  if (!origin || !size) return [];

  const rotation = (load.rotation ?? "0_degrees") as StructureRotation;
  const mirror = (load.mirror ?? "none") as StructureMirror;

  return commands
    .filter((command): command is EmbeddedCommandBlock & { coordinate: StructureCoordinate } =>
      command.coordinate !== undefined
    )
    .map((command) => ({
      flatIndex: command.flatIndex,
      local: command.coordinate,
      world: placedWorldCoordinate(
        command.coordinate,
        size,
        origin,
        { rotation, mirror },
      ),
      command: command.command,
      confidence: "inferred-transform" as const,
    }))
    .sort((a, b) => a.flatIndex - b.flatIndex);
}
