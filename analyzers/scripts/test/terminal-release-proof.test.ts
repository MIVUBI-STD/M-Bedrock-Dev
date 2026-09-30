import { describe, expect, it } from "vitest";
import {
  proveInterproceduralTerminalRelease,
} from "../src/terminal-release-proof.js";

describe("interprocedural terminal release proof", () => {
  it("proves release only when every terminal continuation reaches cleanup", () => {
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
        },
        {
          callerRegion: "function:cleanupArena",
          targetRegion: "function:releaseArena",
          targetName: "releaseArena",
        },
      ],
    });

    expect(result.status).toBe("proven");
  });

  it("fails proof when a terminal branch can bypass release", () => {
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
        },
        {
          callerRegion: "function:finishGame",
          targetRegion: "function:notifyPlayers",
          targetName: "notifyPlayers",
        },
        {
          callerRegion: "function:cleanupArena",
          targetRegion: "function:releaseArena",
          targetName: "releaseArena",
        },
      ],
    });

    expect(result.status).toBe("violated");
  });
});
