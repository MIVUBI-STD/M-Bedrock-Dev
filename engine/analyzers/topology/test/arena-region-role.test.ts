import { describe, expect, it } from "vitest";
import type { ResolvedEffect } from "../src/effect-resolution.js";
import { deriveTopologyCandidates } from "../src/candidates.js";
import { discoverArenaReplicasFromTopology } from "../src/arena-discovery.js";
import { inferArenaRegionPlan } from "../src/arena-region.js";
import { classifyArenaRegionRoles } from "../src/arena-region-role.js";

describe("arena region role classification", () => {
  it("marks exact repeated writes with different content as mutable", () => {
    const effects: ResolvedEffect[] = [
      { kind: "fill", from: { x: 0, y: 0, z: 0 }, to: { x: 4, y: 0, z: 4 }, block: "minecraft:stone", sourcePath: "init.mcfunction" },
      { kind: "fill", from: { x: 100, y: 0, z: 0 }, to: { x: 104, y: 0, z: 4 }, block: "minecraft:stone", sourcePath: "init.mcfunction" },
      { kind: "fill", from: { x: 0, y: 0, z: 0 }, to: { x: 4, y: 0, z: 4 }, block: "minecraft:air", sourcePath: "reset.mcfunction" },
      { kind: "fill", from: { x: 100, y: 0, z: 0 }, to: { x: 104, y: 0, z: 4 }, block: "minecraft:air", sourcePath: "reset.mcfunction" },
    ];

    const candidates = deriveTopologyCandidates(effects);
    const discovery = discoverArenaReplicasFromTopology(
      effects,
      candidates,
      { minCandidateSupport: 2 },
    )!;
    const plan = inferArenaRegionPlan(
      effects,
      candidates,
      discovery,
      { marginBlocks: 0, mergeGapBlocks: 0 },
    )!;

    const classification = classifyArenaRegionRoles(
      plan,
      effects,
      candidates,
    );

    expect(classification.mutableVolumes).toHaveLength(1);
    expect(classification.staticVolumes).toHaveLength(0);
  });

  it("keeps a single replicated write as static evidence", () => {
    const effects: ResolvedEffect[] = [
      { kind: "fill", from: { x: 0, y: 0, z: 0 }, to: { x: 4, y: 0, z: 4 }, block: "minecraft:stone", sourcePath: "wall.mcfunction" },
      { kind: "fill", from: { x: 100, y: 0, z: 0 }, to: { x: 104, y: 0, z: 4 }, block: "minecraft:stone", sourcePath: "wall.mcfunction" },
      { kind: "setblock", position: { x: 10, y: 0, z: 0 }, block: "minecraft:gold_block", sourcePath: "flag.mcfunction" },
      { kind: "setblock", position: { x: 110, y: 0, z: 0 }, block: "minecraft:gold_block", sourcePath: "flag.mcfunction" },
    ];

    const candidates = deriveTopologyCandidates(effects);
    const discovery = discoverArenaReplicasFromTopology(
      effects,
      candidates,
      { minCandidateSupport: 2 },
    )!;
    const plan = inferArenaRegionPlan(
      effects,
      candidates,
      discovery,
      { marginBlocks: 0, mergeGapBlocks: 0 },
    )!;

    const classification = classifyArenaRegionRoles(
      plan,
      effects,
      candidates,
    );

    expect(classification.staticVolumes.length).toBeGreaterThan(0);
    expect(classification.mutableVolumes).toHaveLength(0);
  });
});
