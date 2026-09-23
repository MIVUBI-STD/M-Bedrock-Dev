import { describe, expect, it } from "vitest";
import {
  findScriptEventRule,
  scriptEventSymbol,
} from "../src/script-event-matrix.js";

describe("Script API event symbol matrix", () => {
  it("marks current beta-only world before events as pre-release", () => {
    const rule = findScriptEventRule(
      scriptEventSymbol("world", "beforeEvents", "playerPlaceBlock"),
    );

    expect(rule).toMatchObject({
      stability: "pre-release",
      introducedIn: "2.12.0-beta.1.26.60-preview.23",
    });
  });

  it("keeps long-lived scriptEventReceive stable without inventing a minimum version", () => {
    const rule = findScriptEventRule(
      "system.afterEvents.scriptEventReceive",
    );

    expect(rule?.stability).toBe("stable");
    expect(rule?.introducedIn).toBeUndefined();
  });
});
