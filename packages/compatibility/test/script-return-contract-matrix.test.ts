import { describe, expect, it } from "vitest";
import { checkScriptReturnContract } from "../src/script-return-contract-matrix.js";

describe("Script API return-contract matrix", () => {
  it("only treats direct dereference as risk after the optional-return transition", () => {
    expect(checkScriptReturnContract({
      symbol: "Entity.getComponent",
      resultUse: "dereferenced",
    }, "1.17.0", "stable").state).toBe("safe");

    expect(checkScriptReturnContract({
      symbol: "Entity.getComponent",
      resultUse: "dereferenced",
    }, "1.18.0", "stable").state).toBe("risk");

    expect(checkScriptReturnContract({
      symbol: "Entity.getComponent",
      resultUse: "optional-dereferenced",
    }, "1.18.0", "stable").state).toBe("safe");
  });

  it("distinguishes bounded guarded and unguarded assigned results", () => {
    expect(checkScriptReturnContract({
      symbol: "Entity.getComponent",
      resultUse: "guarded-assigned",
    }, "1.18.0", "stable").state).toBe("safe");

    expect(checkScriptReturnContract({
      symbol: "Entity.getComponent",
      resultUse: "unguarded-assigned",
    }, "1.18.0", "stable").state).toBe("risk");
  });

  it("keeps assigned results unknown instead of guessing downstream guards", () => {
    expect(checkScriptReturnContract({
      symbol: "Entity.getComponent",
      resultUse: "assigned",
    }, "1.18.0", "stable").state).toBe("unknown");
  });
});
