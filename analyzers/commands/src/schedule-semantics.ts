import { parseCoordinate3, type Coordinate3 } from "./coordinates.js";
import { tokenizeCommand } from "./tokenize.js";

export type ScheduleAreaLoadedSemantics =
  | {
      kind: "rectangle";
      from: Coordinate3;
      to: Coordinate3;
      functionName: string;
    }
  | {
      kind: "position";
      position: Coordinate3;
      functionName: string;
    }
  | {
      kind: "circle";
      center: Coordinate3;
      radius: number;
      functionName: string;
    }
  | {
      kind: "tickingarea";
      tickingAreaName: string;
      functionName: string;
    };

export function parseScheduleAreaLoadedSemantics(
  command: string,
): ScheduleAreaLoadedSemantics | undefined {
  const tokens = tokenizeCommand(command);
  if (
    tokens[0]?.toLowerCase() !== "schedule" ||
    tokens[1]?.toLowerCase() !== "on_area_loaded"
  ) return undefined;

  if (tokens[2]?.toLowerCase() === "add") {
    if (tokens[3]?.toLowerCase() === "circle") {
      const center = parseCoordinate3(tokens, 4);
      const radius = Number(tokens[7]);
      const functionName = tokens[8];
      if (center && Number.isInteger(radius) && functionName) {
        return { kind: "circle", center, radius, functionName };
      }
      return undefined;
    }

    const from = parseCoordinate3(tokens, 3);
    const to = parseCoordinate3(tokens, 6);
    const rectangleFunctionName = tokens[9];
    if (from && to && rectangleFunctionName) {
      return {
        kind: "rectangle",
        from,
        to,
        functionName: rectangleFunctionName,
      };
    }

    // Legacy/older authored form retained for compatibility with existing maps.
    const position = parseCoordinate3(tokens, 3);
    const positionFunctionName = tokens[6];
    if (position && positionFunctionName) {
      return {
        kind: "position",
        position,
        functionName: positionFunctionName,
      };
    }
    return undefined;
  }

  if (tokens[2]?.toLowerCase() === "tickingarea" && tokens[3] && tokens[4]) {
    return {
      kind: "tickingarea",
      tickingAreaName: tokens[3],
      functionName: tokens[4],
    };
  }

  return undefined;
}
