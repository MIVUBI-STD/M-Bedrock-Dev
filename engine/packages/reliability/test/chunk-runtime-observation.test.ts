import { describe, expect, it } from "vitest";
import {
  allChunkTargetsReady,
  captureChunkRuntimeReadiness,
} from "../src/index.js";

describe("chunk runtime readiness observation", () => {
  const targets = [
    {
      targetId: "arena-a",
      dimensionId: "overworld",
      location: { x: 31, y: 64, z: -1 },
    },
    {
      targetId: "arena-b",
      dimensionId: "overworld",
      location: { x: 32, y: 64, z: 0 },
    },
  ];

  it("records loaded and unloaded targets with normalized chunk coordinates", () => {
    const result = captureChunkRuntimeReadiness(
      {
        getDimension: () => ({
          isChunkLoaded(location) {
            return location.x < 32;
          },
        }),
      },
      targets,
    );

    expect(result.issues).toEqual([]);
    expect(result.observations).toEqual([
      expect.objectContaining({
        targetId: "arena-a",
        chunkX: 1,
        chunkZ: -1,
        state: "loaded",
      }),
      expect.objectContaining({
        targetId: "arena-b",
        chunkX: 2,
        chunkZ: 0,
        state: "unloaded",
      }),
    ]);
    expect(allChunkTargetsReady(result)).toBe(false);
  });

  it("keeps readiness unknown when isChunkLoaded is unavailable", () => {
    const result = captureChunkRuntimeReadiness(
      { getDimension: () => ({}) },
      [targets[0]!],
    );

    expect(result.observations[0]).toMatchObject({
      state: "unknown",
    });
    expect(result.issues[0]).toMatchObject({
      kind: "probe-unavailable",
      targetId: "arena-a",
    });
    expect(allChunkTargetsReady(result)).toBe(false);
  });

  it("preserves probe failure as unknown evidence instead of inventing readiness", () => {
    const result = captureChunkRuntimeReadiness(
      {
        getDimension: () => ({
          isChunkLoaded() {
            throw new Error("engine unavailable");
          },
        }),
      },
      [targets[0]!],
    );

    expect(result.observations[0]).toMatchObject({
      state: "unknown",
    });
    expect(result.issues[0]).toMatchObject({
      kind: "probe-error",
    });
    expect(allChunkTargetsReady(result)).toBe(false);
  });

  it("requires at least one fully proven loaded target", () => {
    expect(allChunkTargetsReady({
      observations: [],
      issues: [],
    })).toBe(false);

    const result = captureChunkRuntimeReadiness(
      {
        getDimension: () => ({
          isChunkLoaded: () => true,
        }),
      },
      [targets[0]!],
    );
    expect(allChunkTargetsReady(result)).toBe(true);
  });
});
