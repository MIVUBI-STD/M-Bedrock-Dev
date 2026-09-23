import { describe, expect, it } from "vitest";
import { parseMcFunction } from "../../../analyzers/functions/src/parse.js";
import { analyzeFunctionTopology } from "../src/topology-analysis.js";
import { analyzeStructureAndChunkRuntime } from "../src/structure-runtime-analysis.js";
import { derivePlacementProofs } from "../src/structure-proof-analysis.js";
import {
  correlateRouteMutations,
  routeMutationRuntimeEvidence,
} from "../src/route-mutation-analysis.js";

const fn = parseMcFunction(
  "demo:mutate",
  "fill 10 64 10 20 70 20 minecraft:stone",
  { artifactId: "a", relativePath: "functions/mutate.mcfunction" },
);

const topology = analyzeFunctionTopology([fn]);
const structureRuntime = analyzeStructureAndChunkRuntime([fn]);
const proofs = derivePlacementProofs(structureRuntime, [fn]);

describe("route mutation correlation", () => {
  it("proves overlap for a dimension-agnostic route contract", () => {
    const correlations = correlateRouteMutations([{
      id: "bridge",
      volume: {
        min: { x: 0, y: 60, z: 0 },
        max: { x: 30, y: 80, z: 30 },
      },
    }], topology, proofs);

    expect(correlations).toHaveLength(1);
    expect(correlations[0]?.status).toBe("overlap");
    expect(routeMutationRuntimeEvidence(correlations)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          predicate: "route-affecting-world-mutation",
          state: "present",
        }),
      ]),
    );
  });

  it("keeps overlap unresolved when route dimension is known but mutation dimension is not", () => {
    const correlations = correlateRouteMutations([{
      id: "bridge",
      dimension: "overworld",
      volume: {
        min: { x: 0, y: 60, z: 0 },
        max: { x: 30, y: 80, z: 30 },
      },
    }], topology, proofs);

    expect(correlations[0]?.status).toBe("dimension-unresolved");
    expect(routeMutationRuntimeEvidence(correlations)).toEqual([]);
  });

  it("rejects coordinate overlap across explicitly different dimensions", () => {
    const correlations = correlateRouteMutations([{
      id: "bridge",
      dimension: "overworld",
      volume: {
        min: { x: 0, y: 60, z: 0 },
        max: { x: 30, y: 80, z: 30 },
      },
    }], topology, proofs, "nether");

    expect(correlations[0]?.status).toBe("no-overlap");
  });
});
