import { describe, expect, it } from "vitest";
import {
  resolveGameplayAuthority,
  type GameplayAuthorityClaim,
} from "../src/index.js";

function claim(
  partial: Partial<GameplayAuthorityClaim> &
    Pick<GameplayAuthorityClaim, "id" | "value">,
): GameplayAuthorityClaim {
  return {
    domain: "intended-gameplay",
    freshness: "current",
    source: "selected-artifact",
    scope: "capture-run/retry",
    ...partial,
  };
}

describe("gameplay authority resolution", () => {
  it("uses the selected artifact as the only current intended-gameplay authority", () => {
    const result = resolveGameplayAuthority([
      claim({
        id: "selected",
        value: "persist",
      }),
      claim({
        id: "external-doc",
        source: "approved-game-design",
        value: "reset",
      }),
    ], "intended-gameplay", "capture-run/retry");

    expect(result.disposition).toBe("resolved");
    expect(result.value).toBe("persist");
    expect(result.basisClaimIds).toEqual(["selected"]);
  });

  it("does not promote external current documents into current gameplay intent", () => {
    const result = resolveGameplayAuthority([
      claim({
        id: "external-doc",
        source: "current-gameplay-documentation",
        value: "reset",
      }),
    ], "intended-gameplay", "capture-run/retry");

    expect(result.disposition).toBe("unknown");
  });

  it("keeps conflicts inside the selected artifact ambiguous", () => {
    const result = resolveGameplayAuthority([
      claim({ id: "a", value: "reset" }),
      claim({ id: "b", value: "persist" }),
    ], "intended-gameplay", "capture-run/retry");

    expect(result.disposition).toBe("ambiguous");
  });

  it("never promotes historical evidence into current intent", () => {
    const result = resolveGameplayAuthority([
      claim({
        id: "old",
        freshness: "historical",
        source: "historical-evidence",
        value: "reset",
      }),
    ], "intended-gameplay", "capture-run/retry");

    expect(result.disposition).toBe("unknown");
    expect(result.historicalHintIds).toEqual(["old"]);
  });

  it("keeps scope exact instead of borrowing adjacent rules", () => {
    const result = resolveGameplayAuthority([
      claim({
        id: "same-tier",
        scope: "capture-run/retry",
        value: "persist",
      }),
    ], "intended-gameplay", "capture-run/next-tier");

    expect(result.disposition).toBe("unknown");
  });

  it("uses runtime as actual behavior authority without redefining intent", () => {
    const claims: GameplayAuthorityClaim[] = [
      {
        id: "runtime",
        domain: "actual-behavior",
        freshness: "current",
        source: "current-runtime-observation",
        scope: "defense/npc-route",
        value: "stalls",
      },
    ];

    expect(resolveGameplayAuthority(
      claims,
      "actual-behavior",
      "defense/npc-route",
    ).value).toBe("stalls");

    expect(resolveGameplayAuthority(
      claims,
      "intended-gameplay",
      "defense/npc-route",
    ).disposition).toBe("unknown");
  });
});
