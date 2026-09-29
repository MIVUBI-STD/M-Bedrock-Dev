import { describe, expect, it } from "vitest";
import { decideBugGrouping } from "../src/index.js";

describe("bug report split and merge policy", () => {
  it("merges multiple symptoms of the same causal defect", () => {
    expect(
      decideBugGrouping({
        sameCausalDefect: true,
        sameBrokenInvariant: true,
        sameRepairUnit: true,
      }),
    ).toBe("merge");
  });

  it("splits findings with different root causes", () => {
    expect(
      decideBugGrouping({
        sameCausalDefect: false,
        sameBrokenInvariant: true,
        sameRepairUnit: true,
      }),
    ).toBe("split");
  });

  it("splits findings that violate different gameplay invariants", () => {
    expect(
      decideBugGrouping({
        sameCausalDefect: true,
        sameBrokenInvariant: false,
        sameRepairUnit: true,
      }),
    ).toBe("split");
  });

  it("splits findings that require independent repair units", () => {
    expect(
      decideBugGrouping({
        sameCausalDefect: true,
        sameBrokenInvariant: true,
        sameRepairUnit: false,
      }),
    ).toBe("split");
  });

  it("keeps incomplete arena cleanup symptoms together when one cleanup defect owns them", () => {
    expect(
      decideBugGrouping({
        sameCausalDefect: true,
        sameBrokenInvariant: true,
        sameRepairUnit: true,
      }),
    ).toBe("merge");
  });

  it("separates inventory reset, friendly fire, and UI feedback defects", () => {
    expect(
      decideBugGrouping({
        sameCausalDefect: false,
        sameBrokenInvariant: false,
        sameRepairUnit: false,
      }),
    ).toBe("split");
  });
});
