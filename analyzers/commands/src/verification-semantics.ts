import { parseCoordinate3, type Coordinate3 } from "./coordinates.js";
import { tokenizeCommand } from "./tokenize.js";

export interface BlockVerificationSemantics {
  kind: "block";
  position: Coordinate3;
  expectedBlock: string;
  mechanism: "testforblock" | "execute-if-block";
  gatesDependentCommand: boolean;
}

export function parseBlockVerificationSemantics(
  command: string,
): BlockVerificationSemantics | undefined {
  const tokens = tokenizeCommand(command);
  if (tokens.length === 0) return undefined;

  if (tokens[0]?.toLowerCase() === "testforblock") {
    const position = parseCoordinate3(tokens, 1);
    const expectedBlock = tokens[4];
    if (position && expectedBlock) {
      return {
        kind: "block",
        position,
        expectedBlock,
        mechanism: "testforblock",
        gatesDependentCommand: false,
      };
    }
    return undefined;
  }

  if (tokens[0]?.toLowerCase() !== "execute") return undefined;
  const ifIndex = tokens.findIndex((token) => token.toLowerCase() === "if");
  if (ifIndex < 0 || tokens[ifIndex + 1]?.toLowerCase() !== "block") {
    return undefined;
  }

  const position = parseCoordinate3(tokens, ifIndex + 2);
  const expectedBlock = tokens[ifIndex + 5];
  if (!position || !expectedBlock) return undefined;

  const runIndex = tokens.findIndex(
    (token, index) => index > ifIndex + 5 && token.toLowerCase() === "run",
  );

  return {
    kind: "block",
    position,
    expectedBlock,
    mechanism: "execute-if-block",
    gatesDependentCommand: runIndex >= 0 && runIndex < tokens.length - 1,
  };
}
