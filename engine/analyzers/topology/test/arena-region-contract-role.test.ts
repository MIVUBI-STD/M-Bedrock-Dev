import { describe, expect, it } from "vitest";
import type { ResolvedEffect } from "../src/effect-resolution.js";
import { deriveTopologyCandidates } from "../src/candidates.js";
import { discoverArenaReplicasFromTopology } from "../src/arena-discovery.js";
import { inferArenaRegionPlan } from "../src/arena-region.js";
import { classifyArenaRegionRoles } from "../src/arena-region-role.js";

describe("authored arena region roles", () => {
  const effects: ResolvedEffect[] = [
    { kind: "fill", from: { x: 0, y: 0, z: 0 }, to: { x: 10, y: 10, z: 10 }, block: "minecraft:stone", sourcePath: "setup.mcfunction" },
    { kind: "fill", from: { x: 100, y: 0, z: 0 }, to: { x: 110, y: 10, z: 10 }, block: "minecraft:stone", sourcePath: "setup.mcfunction" },
    { kind: "setblock", position: { x: 20, y: 0, z: 0 }, block: "minecraft:gold_block", sourcePath: "flag.mcfunction" },
    { kind: "setblock", position: { x: 120, y: 0, z: 0 }, block: "minecraft:gold_block", sourcePath: "flag.mcfunction" },
  ];

  it("allows an authored mutable contract to override inferred static evidence", () => {
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

    const result = classifyArenaRegionRoles(
      plan,
      effects,
      candidates,
      [{
        id: "build-plot",
        role: "mutable",
        coordinateSpace: "canonical-relative",
        volume: {
          min: { x: 0, y: 0, z: 0 },
          max: { x: 10, y: 10, z: 10 },
        },
      }],
      discovery.canonical.anchor,
    );

    expect(result.mutableVolumes).toHaveLength(1);
    expect(
      result.volumes.find((item) => item.role === "mutable")
        ?.roleAuthority,
    ).toBe("authored-contract");
  });

  it("keeps conflicting authored roles as mixed instead of choosing silently", () => {
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

    const result = classifyArenaRegionRoles(
      plan,
      effects,
      candidates,
      [
        {
          id: "a",
          role: "mutable",
          coordinateSpace: "absolute",
          volume: {
            min: { x: 0, y: 0, z: 0 },
            max: { x: 10, y: 10, z: 10 },
          },
        },
        {
          id: "b",
          role: "static",
          coordinateSpace: "absolute",
          volume: {
            min: { x: 0, y: 0, z: 0 },
            max: { x: 10, y: 10, z: 10 },
          },
        },
      ],
      discovery.canonical.anchor,
    );

    expect(result.mixedVolumes).toHaveLength(1);
    expect(
      result.volumes.find((item) => item.role === "mixed")
        ?.roleAuthority,
    ).toBe("conflict");
  });
});
