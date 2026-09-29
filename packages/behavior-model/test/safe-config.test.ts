import { describe, expect, it } from "vitest";
import {
  SafeConfigEvaluationError,
  evaluateSafeConfig,
} from "../src/safe-config.js";

describe("safe config evaluator", () => {
  it("resolves pure coordinate transforms without executing artifact JavaScript", () => {
    const value = evaluateSafeConfig(
      {
        kind: "intrinsic",
        name: "translate3",
        args: [
          { kind: "ref", name: "base" },
          { kind: "ref", name: "arena2Offset" },
        ],
      },
      {
        bindings: {
          base: {
            kind: "literal",
            value: { x: 444, y: 51, z: 280 },
          },
          arena2Offset: {
            kind: "literal",
            value: { x: 0, y: 0, z: -516 },
          },
        },
      },
    );

    expect(value).toEqual({ x: 444, y: 51, z: -236 });
  });

  it("fails closed on cycles", () => {
    expect(() =>
      evaluateSafeConfig(
        { kind: "ref", name: "a" },
        {
          bindings: {
            a: { kind: "ref", name: "b" },
            b: { kind: "ref", name: "a" },
          },
        },
      )
    ).toThrowError(SafeConfigEvaluationError);
  });
});
