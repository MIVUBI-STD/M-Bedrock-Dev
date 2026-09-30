import { describe, expect, it } from "vitest";
import {
  deriveTerminalRaceEvidence,
} from "../src/terminal-race-evidence.js";

describe("terminal race evidence", () => {
  it("surfaces direct and deferred completion paths without declaring a bug", () => {
    const result = deriveTerminalRaceEvidence(
      `
        function onBossDeath() {
          finishGame();
          system.runTimeout(() => finishGame(), 1);
        }
      `,
      { artifactId: "artifact:test", relativePath: "scripts/main.ts" },
    );

    expect(result).toEqual([
      expect.objectContaining({
        executionRegion: "function:onBossDeath",
        target: "finishGame",
        directCalls: 1,
        deferredCalls: 1,
        classification: "competing-terminal-paths",
      }),
    ]);
  });
});
