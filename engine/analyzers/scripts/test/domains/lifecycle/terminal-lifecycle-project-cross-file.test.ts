import { describe, expect, it } from "vitest";
import {
  composeQualifiedScriptLifecycleProjectGraph,
} from "../../../src/domains/lifecycle/terminal-lifecycle-project.js";

describe("qualified cross-file call graph", () => {
  it("resolves release reachability across module boundaries without name collisions", () => {
    const graph =
      composeQualifiedScriptLifecycleProjectGraph(
        [
          {
            fileId:
              "scripts/main.ts",
            localFunctionCalls: [],
          },
          {
            fileId:
              "scripts/cleanup.ts",
            localFunctionCalls: [{
              callerRegion:
                "function:cleanupArena",
              targetRegion:
                "function:releaseArena",
              targetName:
                "releaseArena",
              controlFlow:
                "unconditional",
              source: {
                artifactId: "map",
                relativePath:
                  "scripts/cleanup.ts",
              },
            }],
          },
        ],
        [{
          callerModule:
            "scripts/main.ts",
          callerRegion:
            "function:finishGame",
          targetModule:
            "scripts/cleanup.ts",
          targetExport:
            "cleanupArena",
          localName:
            "cleanupArena",
          controlFlow:
            "unconditional",
          status: "resolved",
          source: {
            artifactId: "map",
            relativePath:
              "scripts/main.ts",
          },
        }],
      );

    expect(
      graph.callEdges.some(
        (edge) =>
          edge.callerRegion ===
            "module:scripts/main.ts#function:finishGame" &&
          edge.targetRegion ===
            "module:scripts/cleanup.ts#function:cleanupArena",
      ),
    ).toBe(true);

    expect(
      graph
        .reachableReleaseFunctions,
    ).toContain(
      "module:scripts/cleanup.ts#function:releaseArena",
    );
  });
});
