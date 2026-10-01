import { describe, expect, it } from "vitest";
import type { ResolvedEffect } from "../../../../analyzers/topology/src/index.js";
import { proveArenaEntityPopulation } from "../../src/arena/arena-entity-population-proof.js";

describe("arena entity population proof", () => {
  const layout = {
    basis: "topology" as const,
    canonical: {
      arenaId: "arena-1",
      anchor: { x: 0, y: 0, z: 0 },
    },
    replicas: [{
      arenaId: "arena-2",
      anchor: { x: 100, y: 0, z: 0 },
    }],
    offsets: [{ x: 100, y: 0, z: 0 }],
    confidence: "high" as const,
  };
  const regionPlan = {
    volumes: [{
      min: { x: 0, y: 0, z: 0 },
      max: { x: 20, y: 20, z: 20 },
      evidenceCandidateIds: [],
    }],
    boundingBox: {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 20, y: 20, z: 20 },
    },
    totalBlocks: 9261,
    evidenceCandidates: 0,
    mergeGapBlocks: 0,
    confidence: "high" as const,
  };

  it("verifies translated entity spawn populations", () => {
    const effects: ResolvedEffect[] = [
      {
        kind: "entity-spawn",
        entityIdentifier: "minecraft:zombie",
        position: { x: 5, y: 1, z: 5 },
        sourcePath: "a",
      },
      {
        kind: "entity-spawn",
        entityIdentifier: "minecraft:zombie",
        position: { x: 105, y: 1, z: 5 },
        sourcePath: "b",
      },
    ];

    const result = proveArenaEntityPopulation(
      layout,
      regionPlan,
      effects,
    );
    expect(result.status).toBe("verified");
  });

  it("detects missing replica entity spawn", () => {
    const effects: ResolvedEffect[] = [{
      kind: "entity-spawn",
      entityIdentifier: "minecraft:zombie",
      position: { x: 5, y: 1, z: 5 },
      sourcePath: "a",
    }];

    const result = proveArenaEntityPopulation(
      layout,
      regionPlan,
      effects,
    );
    expect(result.status).toBe("diverged");
    expect(result.replicas[0]?.mismatches[0]?.kind)
      .toBe("missing");
  });
});
