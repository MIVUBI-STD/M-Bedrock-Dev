import { describe, expect, it } from "vitest";
import {
  detectGameplayDegradation,
} from "../src/index.js";

describe("gameplay degradation", () => {
  it("detects reduced capacity while gameplay still runs", () => {
    const signals = detectGameplayDegradation({
      subjectId: "arena-capacity",
      primaryExpected: true,
      primaryObserved: false,
      expectedCapacity: 6,
      observedCapacity: 2,
    });

    expect(
      signals.some(
        (item) =>
          item.kind === "capacity-reduced",
      ),
    ).toBe(true);
  });

  it("detects fallback masking a failed primary mechanic", () => {
    const signals = detectGameplayDegradation({
      subjectId: "special-enemy",
      primaryExpected: true,
      primaryObserved: false,
      fallbackObserved: true,
    });

    expect(signals[0]?.kind)
      .toBe("fallback-masks-primary-failure");
  });
});
