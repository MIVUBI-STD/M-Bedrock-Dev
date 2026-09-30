import { describe, expect, it } from "vitest";
import {
  composeScriptLifecycleProjectGraph,
} from "../src/terminal-lifecycle-project.js";

describe("interprocedural script call graph", () => {
  it("finds release functions reachable through local calls", () => {
    const result =
      composeScriptLifecycleProjectGraph([
        {
          fileId: "scripts/main.ts",
          localFunctionCalls: [
            {
              callerRegion:
                "function:finishGame",
              targetRegion:
                "function:cleanupArena",
              targetName:
                "cleanupArena",
              controlFlow:
                "unconditional",
              source: {
                artifactId:
                  "artifact:test",
                relativePath:
                  "scripts/main.ts",
              },
            },
            {
              callerRegion:
                "function:cleanupArena",
              targetRegion:
                "function:releaseArena",
              targetName:
                "releaseArena",
              controlFlow:
                "unconditional",
              source: {
                artifactId:
                  "artifact:test",
                relativePath:
                  "scripts/main.ts",
              },
            },
          ],
        },
      ]);

    expect(
      result
        .reachableReleaseFunctions,
    ).toContain(
      "function:releaseArena",
    );
  });
});
