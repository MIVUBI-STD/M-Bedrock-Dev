import { describe, expect, it } from "vitest";
import {
  assessCapabilityExposure,
  findGameplayReachability,
  type GameplayReachabilityGraph,
} from "../src/index.js";

describe("generic gameplay exploitability reasoning", () => {
  const graph: GameplayReachabilityGraph = {
    nodes: [
      {
        id: "player:ordinary",
        kind: "player",
        label: "Ordinary Player",
        playerAccessible: true,
      },
      {
        id: "resource:material-a",
        kind: "resource",
        label: "Material A",
      },
      {
        id: "item:tool-b",
        kind: "item",
        label: "Tool B",
      },
    ],
    edges: [
      {
        from: "player:ordinary",
        to: "resource:material-a",
        kind: "contains",
      },
      {
        from: "resource:material-a",
        to: "item:tool-b",
        kind: "crafts",
      },
    ],
  };

  it("proves prerequisite reachability through arbitrary acquisition chains", () => {
    const path =
      findGameplayReachability(
        graph,
        "item:tool-b",
      );

    expect(path.reachable).toBe(true);
    expect(path.nodeIds).toEqual([
      "player:ordinary",
      "resource:material-a",
      "item:tool-b",
    ]);
  });

  it("marks an enabled unauthorized capability exposed when its prerequisite is reachable", () => {
    const path =
      findGameplayReachability(
        graph,
        "item:tool-b",
      );

    const result =
      assessCapabilityExposure({
        capabilityId:
          "capability:restricted-action",
        capabilityLabel:
          "Restricted Action",
        releaseEnabled: "enabled",
        authorization:
          "required-but-missing",
        triggerPresent: true,
        prerequisitePaths: [path],
        playerImpact: "progression",
      });

    expect(result.status).toBe("exposed");
    expect(
      result.prerequisiteReachability,
    ).toBe("reachable");
  });
});
