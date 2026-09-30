import { describe, expect, it } from "vitest";
import {
  fuseTerminalRaceWithLifecycle,
} from "../src/terminal-lifecycle-fusion.js";

describe("terminal lifecycle fusion", () => {
  it("confirms lifecycle defects only when race evidence and lifecycle proof agree", () => {
    const result = fuseTerminalRaceWithLifecycle(
      [{
        executionRegion: "function:end",
        target: "finishGame",
        directCalls: 1,
        deferredCalls: 1,
        classification: "competing-terminal-paths",
        source: {
          artifactId: "artifact:test",
          relativePath: "scripts/main.ts",
        },
      }],
      {
        status: "violated",
        inevitableReleaseStates: [],
        checkedTerminalTransitions: ["finish"],
        violations: [{
          transitionId: "finish",
          trigger: "victory",
          from: "playing",
          to: "finishing",
          reason: "terminal-target-can-dead-end",
        }],
      },
    );

    expect(result.disposition).toBe(
      "confirmed-lifecycle-defect",
    );
  });
});
