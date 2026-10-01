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
    source: "approved-game-design",
    scope: "capture-run/retry",
    ...partial,
  };
}

describe("gameplay authority resolution", () => {
  it("prefers current explicit user decisions for intended behavior", () => {
    const result = resolveGameplayAuthority([
      claim({
        id: "design",
        value: "reset",
      }),
      claim({
        id: "user",
        source: "current-user-decision",
        value: "persist",
      }),
    ], "intended-gameplay", "capture-run/retry");

    expect(result.disposition).toBe("resolved");
    expect(result.value).toBe("persist");
    expect(result.basisClaimIds).toEqual(["user"]);
  });

  it("keeps equally authoritative current conflicts ambiguous", () => {
    const result = resolveGameplayAuthority([
      claim({ id: "a", value: "reset" }),
      claim({ id: "b", value: "persist" }),
    ], "intended-gameplay", "capture-run/retry");

    expect(result.disposition).toBe("ambiguous");
    expect(result.basisClaimIds).toEqual(["a", "b"]);
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

  it("uses runtime as actual behavior authority without turning it into intent", () => {
    const claims: GameplayAuthorityClaim[] = [
      {
        id: "runtime",
        domain: "actual-behavior",
        freshness: "current",
        source: "current-runtime-observation",
        scope: "defense/npc-route",
        value: "stalls",
      },
      {
        id: "source",
        domain: "actual-behavior",
        freshness: "current",
        source: "current-source",
        scope: "defense/npc-route",
        value: "repaths",
      },
    ];

    const actual = resolveGameplayAuthority(
      claims,
      "actual-behavior",
      "defense/npc-route",
    );
    const intended = resolveGameplayAuthority(
      claims,
      "intended-gameplay",
      "defense/npc-route",
    );

    expect(actual.value).toBe("stalls");
    expect(intended.disposition).toBe("unknown");
  });

  it("prefers the explicitly selected release artifact", () => {
    const claims: GameplayAuthorityClaim[] = [
      {
        id: "selected",
        domain: "release-identity",
        freshness: "current",
        source: "selected-artifact",
        scope: "challenge",
        value: "1.1.1",
      },
      {
        id: "manifest",
        domain: "release-identity",
        freshness: "current",
        source: "current-manifest",
        scope: "challenge",
        value: "1.1.0",
      },
    ];

    const result = resolveGameplayAuthority(
      claims,
      "release-identity",
      "challenge",
    );

    expect(result.value).toBe("1.1.1");
  });
});
