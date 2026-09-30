import { describe, expect, it } from "vitest";
import { deriveTopologyCandidates } from "../src/candidates.js";
import { discoverArenaReplicasFromTopology } from "../src/arena-discovery.js";
import type { ResolvedEffect } from "../src/effect-resolution.js";

describe("arena replica discovery", () => {
  it("discovers shared arena translations only when multiple independent topology candidates support them", () => {
    const effects: ResolvedEffect[] = [
      { kind: "setblock", position: { x: 0, y: 0, z: 0 }, block: "minecraft:stone", sourcePath: "a" },
      { kind: "setblock", position: { x: 100, y: 0, z: 0 }, block: "minecraft:stone", sourcePath: "a" },
      { kind: "setblock", position: { x: 0, y: 0, z: 10 }, block: "minecraft:gold_block", sourcePath: "b" },
      { kind: "setblock", position: { x: 100, y: 0, z: 10 }, block: "minecraft:gold_block", sourcePath: "b" },
      { kind: "entity-spawn", position: { x: 5, y: 0, z: 5 }, entityIdentifier: "minecraft:zombie", sourcePath: "c" },
      { kind: "entity-spawn", position: { x: 105, y: 0, z: 5 }, entityIdentifier: "minecraft:zombie", sourcePath: "c" },
    ];

    const discovery = discoverArenaReplicasFromTopology(
      effects,
      deriveTopologyCandidates(effects),
      { minCandidateSupport: 3 },
    );

    expect(discovery?.offsets).toEqual([{ x: 100, y: 0, z: 0 }]);
    expect(discovery?.canonical.items).toHaveLength(3);
    expect(discovery?.replicas[0]?.items).toHaveLength(3);
  });

  it("does not promote a single repeated effect into an arena model", () => {
    const effects: ResolvedEffect[] = [
      { kind: "setblock", position: { x: 0, y: 0, z: 0 }, block: "minecraft:stone", sourcePath: "a" },
      { kind: "setblock", position: { x: 100, y: 0, z: 0 }, block: "minecraft:stone", sourcePath: "a" },
    ];

    expect(
      discoverArenaReplicasFromTopology(
        effects,
        deriveTopologyCandidates(effects),
      ),
    ).toBeUndefined();
  });
});
