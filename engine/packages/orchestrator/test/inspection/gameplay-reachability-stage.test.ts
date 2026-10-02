import { describe, expect, it } from "vitest";
import {
  buildGameplayReachabilityGraph,
} from "../../src/inspection/gameplay-reachability-stage.js";
import {
  findGameplayReachability,
} from "../../../diagnostic-reasoning/src/index.js";

describe("gameplay reachability stage", () => {
  it("projects player item acquisition without item-specific rules", () => {
    const graph =
      buildGameplayReachabilityGraph([
        {
          parsed: {
            identifier: "gameplay",
            source: {
              artifactId: "map",
              relativePath: "scripts/gameplay.ts",
            },
            inventoryLifecycleEvidence: [
              {
                kind: "item-grant",
                executionRegion:
                  "function:giveReward",
                subjectExpression:
                  "player.inventory",
                itemIdentifier:
                  "custom:access_token",
                source: {
                  artifactId: "map",
                  relativePath:
                    "scripts/gameplay.ts",
                  range: {
                    lineStart: 12,
                    lineEnd: 12,
                  },
                },
              },
            ],
            commandLiterals: [],
          } as any,
          text: "",
        },
      ]);

    expect(
      findGameplayReachability(
        graph,
        "item:custom:access_token",
      ).reachable,
    ).toBe(true);
  });
});
