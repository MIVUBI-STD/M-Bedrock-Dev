import { describe, expect, it } from "vitest";
import {
  parseScriptFile,
} from "../src/parse.js";

describe("local function call control flow", () => {
  it("distinguishes unconditional and conditional local calls", () => {
    const parsed = parseScriptFile(
      "scripts/main.ts",
      `
        function cleanupArena() {}
        function notifyPlayers() {}
        function finishGame(shouldNotify) {
          cleanupArena();
          if (shouldNotify) {
            notifyPlayers();
          }
        }
      `,
      {
        artifactId: "artifact:test",
        relativePath: "scripts/main.ts",
      },
    );

    const byTarget = new Map(
      parsed.localFunctionCalls.map((call) => [
        call.targetName,
        call.controlFlow,
      ]),
    );

    expect(byTarget.get("cleanupArena")).toBe(
      "unconditional",
    );
    expect(byTarget.get("notifyPlayers")).toBe(
      "conditional",
    );
  });
});
