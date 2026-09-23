import { parseCoordinate3, type Coordinate3 } from "./coordinates.js";
import { tokenizeCommand } from "./tokenize.js";

export type TickingAreaSemantics =
  | {
      action: "add-rectangle";
      from: Coordinate3;
      to: Coordinate3;
      name?: string;
      preload?: boolean;
    }
  | {
      action: "add-circle";
      center: Coordinate3;
      radius: number;
      name?: string;
      preload?: boolean;
    }
  | {
      action: "remove";
      target: string;
    }
  | {
      action: "remove-all";
    }
  | {
      action: "preload";
      target: string;
      preload?: boolean;
    }
  | {
      action: "list";
      allDimensions: boolean;
    };

function asBoolean(value: string | undefined): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

export function parseTickingAreaSemantics(
  command: string,
): TickingAreaSemantics | undefined {
  const tokens = tokenizeCommand(command);
  if (tokens[0]?.toLowerCase() !== "tickingarea") return undefined;

  const action = tokens[1]?.toLowerCase();
  if (action === "remove_all") return { action: "remove-all" };
  if (action === "list") {
    return {
      action: "list",
      allDimensions: tokens[2]?.toLowerCase() === "all-dimensions",
    };
  }

  if (action === "add" && tokens[2]?.toLowerCase() === "circle") {
    const center = parseCoordinate3(tokens, 3);
    const radius = Number(tokens[6]);
    if (!center || !Number.isInteger(radius)) return undefined;
    const name = tokens[7];
    const preload = asBoolean(tokens[8]);
    return {
      action: "add-circle",
      center,
      radius,
      ...(name ? { name } : {}),
      ...(preload !== undefined ? { preload } : {}),
    };
  }

  if (action === "add") {
    const from = parseCoordinate3(tokens, 2);
    const to = parseCoordinate3(tokens, 5);
    if (!from || !to) return undefined;
    const name = tokens[8];
    const preload = asBoolean(tokens[9]);
    return {
      action: "add-rectangle",
      from,
      to,
      ...(name ? { name } : {}),
      ...(preload !== undefined ? { preload } : {}),
    };
  }

  if (action === "remove" && tokens[2]) {
    return { action: "remove", target: tokens.slice(2).join(" ") };
  }

  if (action === "preload" && tokens[2]) {
    const preload = asBoolean(tokens.at(-1));
    const targetTokens = preload === undefined ? tokens.slice(2) : tokens.slice(2, -1);
    return {
      action: "preload",
      target: targetTokens.join(" "),
      ...(preload !== undefined ? { preload } : {}),
    };
  }

  return undefined;
}
