import { describe, expect, it } from "vitest";
import type { ResolvedEffect } from "../src/effect-resolution.js";
import { deriveTopologyCandidates } from "../src/candidates.js";
import { discoverArenaReplicasFromTopology } from "../src/arena-discovery.js";
import { inferArenaRegionPlan } from "../src/arena-region.js";

describe("arena region inference", () => {
  it("uses clone destination footprint instead of remote source template", () => {
    const effects: ResolvedEffect[] = [
      {
        kind: "clone",
        from: { x: 1000, y: 0, z: 1000 },
        to: { x: 1009, y: 9, z: 1009 },
        destination: { x: 0, y: 0, z: 0 },
        sourcePath: "arena.mcfunction",
      },
      {
        kind: "clone",
        from: { x: 1000, y: 0, z: 1000 },
        to: { x: 1009, y: 9, z: 1009 },
        destination: { x: 100, y: 0, z: 0 },
        sourcePath: "arena.mcfunction",
      },
      {
        kind: "setblock",
        position: { x: 5, y: 1, z: 5 },
        block: "minecraft:gold_block",
        sourcePath: "arena.mcfunction",
      },
      {
        kind: "setblock",
        position: { x: 105, y: 1, z: 5 },
        block: "minecraft:gold_block",
        sourcePath: "arena.mcfunction",
      },
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

    expect(plan.boundingBox.min.x).toBe(0);
    expect(plan.boundingBox.max.x).toBe(9);
    expect(plan.boundingBox.max.x).toBeLessThan(1000);
  });

  it("keeps distant supported areas as separate volumes instead of scanning the empty gap", () => {
    const effects: ResolvedEffect[] = [
      { kind: "setblock", position: { x: 0, y: 0, z: 0 }, block: "minecraft:stone", sourcePath: "a" },
      { kind: "setblock", position: { x: 100, y: 0, z: 0 }, block: "minecraft:stone", sourcePath: "a" },
      { kind: "setblock", position: { x: 0, y: 0, z: 80 }, block: "minecraft:gold_block", sourcePath: "b" },
      { kind: "setblock", position: { x: 100, y: 0, z: 80 }, block: "minecraft:gold_block", sourcePath: "b" },
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
      { marginBlocks: 1, mergeGapBlocks: 8 },
    )!;

    expect(plan.volumes).toHaveLength(2);
    expect(plan.totalBlocks).toBeLessThan(
      (plan.boundingBox.max.x - plan.boundingBox.min.x + 1) *
      (plan.boundingBox.max.y - plan.boundingBox.min.y + 1) *
      (plan.boundingBox.max.z - plan.boundingBox.min.z + 1),
    );
  });
});
