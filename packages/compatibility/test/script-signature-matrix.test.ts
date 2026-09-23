import { describe, expect, it } from "vitest";
import {
  checkScriptMethodSignature,
  type ScriptArgumentKind,
  type ScriptMethodCallShapeObservation,
} from "../src/script-signature-matrix.js";

function call(
  symbol: string,
  argumentKinds: ScriptArgumentKind[],
): ScriptMethodCallShapeObservation {
  return {
    symbol,
    argumentCount: argumentKinds.length,
    argumentKinds,
    hasSpreadArgument: argumentKinds.includes("spread"),
  };
}

describe("Script API signature matrix", () => {
  it("distinguishes applyKnockback 1.x and 2.x call shapes", () => {
    const legacy = call("Entity.applyKnockback", [
      "number", "number", "number", "number",
    ]);
    const current = call("Entity.applyKnockback", ["object", "number"]);

    expect(checkScriptMethodSignature(
      legacy,
      "1.19.0",
      "stable",
    ).compatible).toBe(true);
    expect(checkScriptMethodSignature(
      legacy,
      "2.0.0",
      "stable",
    ).compatible).toBe(false);
    expect(checkScriptMethodSignature(
      current,
      "2.0.0",
      "stable",
    ).compatible).toBe(true);
  });

  it("allows spawnEntity options only from 2.0.0 onward", () => {
    const withOptions = call("Dimension.spawnEntity", [
      "string", "object", "object",
    ]);

    expect(checkScriptMethodSignature(
      withOptions,
      "1.19.0",
      "stable",
    ).compatible).toBe(false);
    expect(checkScriptMethodSignature(
      withOptions,
      "2.0.0",
      "stable",
    ).compatible).toBe(true);
  });

  it("keeps spread-argument arity unknown", () => {
    const spread = call("Entity.applyKnockback", ["spread"]);
    expect(checkScriptMethodSignature(
      spread,
      "2.0.0",
      "stable",
    ).compatible).toBe("unknown");
  });
});
