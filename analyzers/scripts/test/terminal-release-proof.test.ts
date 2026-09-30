import { describe, expect, it } from "vitest";
import {
  proveInterproceduralTerminalRelease,
} from "../src/terminal-release-proof.js";

describe("interprocedural terminal release proof", () => {
  it("does not treat another sequential call as a branch bypass", () => {
    const result = proveInterproceduralTerminalRelease({
      transitions: [],
      reachableReleaseFunctions: [
        "function:releaseArena",
      ],
      callEdges: [
        {
          callerRegion: "function:finishGame",
          targetRegion: "function:cleanupArena",
          targetName: "cleanupArena",
          controlFlow: "unconditional",
        },
        {
          callerRegion: "function:finishGame",
          targetRegion: "function:notifyPlayers",
          targetName: "notifyPlayers",
          controlFlow: "unconditional",
        },
        {
          callerRegion: "function:cleanupArena",
          targetRegion: "function:releaseArena",
          targetName: "releaseArena",
          controlFlow: "unconditional",
        },
      ],
    });

    expect(result.status).toBe("proven");
  });

  it("keeps conditional-only release unknown instead of falsely proving it", () => {
    const result = proveInterproceduralTerminalRelease({
      transitions: [],
      reachableReleaseFunctions: [
        "function:releaseArena",
      ],
      callEdges: [
        {
          callerRegion: "function:finishGame",
          targetRegion: "function:releaseArena",
          targetName: "releaseArena",
          controlFlow: "conditional",
        },
      ],
    });

    expect(result.status).toBe("unknown");
    expect(result.unknownRegions).toEqual([
      "function:finishGame",
    ]);
  });
});
