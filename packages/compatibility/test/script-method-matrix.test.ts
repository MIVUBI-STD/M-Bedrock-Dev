import { describe, expect, it } from "vitest";
import {
  checkScriptMethodSymbol,
  findScriptMethodRule,
} from "../src/script-method-matrix.js";

describe("Script API method symbol matrix", () => {
  it("tracks stable minima for methods used by the runtime harness", () => {
    expect(findScriptMethodRule("world.getAllPlayers")).toMatchObject({
      stability: "stable",
      introducedIn: "1.0.0",
    });
    expect(findScriptMethodRule("system.runInterval")).toMatchObject({
      stability: "stable",
      introducedIn: "1.1.0",
    });
  });

  it("evaluates stable method minima without guessing beta compatibility", () => {
    expect(checkScriptMethodSymbol(
      "system.runInterval",
      "1.0.0",
      "stable",
    ).supported).toBe(false);
    expect(checkScriptMethodSymbol(
      "system.runInterval",
      "1.1.0",
      "stable",
    ).supported).toBe(true);
    expect(checkScriptMethodSymbol(
      "system.runInterval",
      "2.12.0-beta.1.26.60-preview.25",
      "beta",
    ).supported).toBe("unknown");
  });
});
