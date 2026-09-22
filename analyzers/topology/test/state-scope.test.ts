import { describe, expect, it } from "vitest";
import { classifySelector, likelyGlobalAccess } from "../src/state-scope.js";

describe("state scope", () => {
  it("classifies broad and scoped selectors", () => {
    expect(classifySelector("@a")).toBe("all_players");
    expect(classifySelector("@s")).toBe("self");
    expect(classifySelector("@a[tag=arena1]")).toBe("filtered");
  });

  it("marks all-player/all-entity access as likely global", () => {
    expect(likelyGlobalAccess({
      stateKind: "scoreboard",
      key: "state",
      access: "write",
      selector: "@a",
      selectorScope: "all_players",
    })).toBe(true);
  });
});
