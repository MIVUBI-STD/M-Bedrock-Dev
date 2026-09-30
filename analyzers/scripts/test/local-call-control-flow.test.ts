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

  it("treats calls after a possible early return as conditional", () => {
    const parsed = parseScriptFile(
      "scripts/main.ts",
      `
        function cleanupArena() {}
        function finishGame(skipCleanup) {
          if (skipCleanup) return;
          cleanupArena();
        }
      `,
      {
        artifactId: "artifact:test",
        relativePath: "scripts/main.ts",
      },
    );

    expect(
      parsed.localFunctionCalls.find(
        (call) => call.targetName === "cleanupArena",
      )?.controlFlow,
    ).toBe("conditional");
  });

});
