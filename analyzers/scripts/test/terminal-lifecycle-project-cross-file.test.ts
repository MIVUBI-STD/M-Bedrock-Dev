import { describe, expect, it } from "vitest";
import {
  composeQualifiedScriptLifecycleProjectGraph,
} from "../src/terminal-lifecycle-project.js";
import {
  proveInterproceduralTerminalRelease,
} from "../src/terminal-release-proof.js";

describe("qualified cross-file lifecycle graph", () => {
  it("proves release across module boundaries without function-name collisions", () => {
    const graph = composeQualifiedScriptLifecycleProjectGraph(
      [
        {
          fileId: "scripts/main.ts",
          graph: { transitions: [], states: [] },
          localFunctionCalls: [],
        },
        {
          fileId: "scripts/cleanup.ts",
          graph: { transitions: [], states: [] },
          localFunctionCalls: [{
            callerRegion: "function:cleanupArena",
            targetRegion: "function:releaseArena",
            targetName: "releaseArena",
            controlFlow: "unconditional",
            source: {
              artifactId: "map",
              relativePath: "scripts/cleanup.ts",
            },
          }],
        },
      ],
      [{
        callerModule: "scripts/main.ts",
        callerRegion: "function:finishGame",
        targetModule: "scripts/cleanup.ts",
        targetExport: "cleanupArena",
        localName: "cleanupArena",
        controlFlow: "unconditional",
        status: "resolved",
        source: {
          artifactId: "map",
          relativePath: "scripts/main.ts",
        },
      }],
    );

    expect(graph.callEdges[0]?.callerRegion).toContain(
      "module:scripts/cleanup.ts#",
    );

    const proof = proveInterproceduralTerminalRelease(graph);
    expect(proof.status).toBe("proven");
  });
});
