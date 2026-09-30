import { describe, expect, it } from "vitest";
import {
  proveArenaCanonicalEquivalence,
} from "../src/arena-canonical-proof.js";
import {
  compareArenaReplicas,
} from "../src/arena-replica.js";

const reference = {
  arenaId: "arena-1",
  anchor: { x: 0, y: 0, z: 0 },
  items: [
    {
      key: "spawn",
      signature: "player-spawn",
      position: { x: 2, y: 0, z: 2 },
    },
  ],
};

describe("arena canonical proof", () => {
  it("marks cross-layer disagreement as conflicted instead of hiding it", () => {
    const config = compareArenaReplicas(reference, {
      arenaId: "arena-2",
      anchor: { x: 100, y: 0, z: 0 },
      items: [
        {
          key: "spawn",
          signature: "player-spawn",
          position: { x: 102, y: 0, z: 2 },
        },
      ],
    });
    const world = compareArenaReplicas(reference, {
      arenaId: "arena-2",
      anchor: { x: 100, y: 0, z: 0 },
      items: [
        {
          key: "spawn",
          signature: "player-spawn",
          position: { x: 105, y: 0, z: 2 },
        },
      ],
    });

    const proof = proveArenaCanonicalEquivalence([
      { layer: "script-config", comparison: config },
      { layer: "world-db", comparison: world },
    ]);

    expect(proof.status).toBe("conflicted");
    expect(proof.mismatches[0]).toEqual(
      expect.objectContaining({
        key: "spawn",
        layers: ["world-db"],
      }),
    );
  });
});
