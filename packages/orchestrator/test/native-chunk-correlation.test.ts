import { describe, expect, it } from "vitest";

describe("native chunk correlation contract", () => {
  it("matches structure destination chunks independent of dimension assumption", () => {
    const destination = { target: "demo:arena", chunkX: -1, chunkZ: 2 };
    const signals = [
      { chunkX: -1, chunkZ: 2, dimensionId: 0, kinds: ["BlockEntity"] },
      { chunkX: -1, chunkZ: 2, dimensionId: 1, kinds: ["PendingTicks"] },
      { chunkX: 0, chunkZ: 2, dimensionId: 0, kinds: ["BlockEntity"] },
    ];

    const matches = signals.filter(
      (chunk) =>
        chunk.chunkX === destination.chunkX &&
        chunk.chunkZ === destination.chunkZ,
    );

    expect(matches).toHaveLength(2);
    expect(matches.map((item) => item.dimensionId).sort()).toEqual([0, 1]);
  });
});
