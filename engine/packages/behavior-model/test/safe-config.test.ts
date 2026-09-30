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

  it("evaluates bounded map Array.from and pure helper calls", () => {
    const value = evaluateSafeConfig(
      {
        kind: "object",
        entries: {
          mapped: {
            kind: "map",
            source: {
              kind: "literal",
              value: [1, 2, 3],
            },
            itemName: "item",
            indexName: "index",
            body: {
              kind: "call",
              name: "doubleWithIndex",
              args: [
                { kind: "ref", name: "item" },
                { kind: "ref", name: "index" },
              ],
            },
          },
          generated: {
            kind: "array-from",
            length: {
              kind: "literal",
              value: 3,
            },
            indexName: "index",
            body: {
              kind: "binary",
              operator: "*",
              left: {
                kind: "ref",
                name: "index",
              },
              right: {
                kind: "literal",
                value: 10,
              },
            },
          },
        },
      },
      {
        bindings: {},
        functions: {
          doubleWithIndex: {
            params: ["value", "index"],
            body: {
              kind: "binary",
              operator: "+",
              left: {
                kind: "binary",
                operator: "*",
                left: {
                  kind: "ref",
                  name: "value",
                },
                right: {
                  kind: "literal",
                  value: 2,
                },
              },
              right: {
                kind: "ref",
                name: "index",
              },
            },
          },
        },
      },
    );

    expect(value).toEqual({
      mapped: [2, 5, 8],
      generated: [0, 10, 20],
    });
  });

  it("fails closed when collection transforms exceed their budget", () => {
    expect(() =>
      evaluateSafeConfig(
        {
          kind: "array-from",
          length: {
            kind: "literal",
            value: 5,
          },
          indexName: "index",
          body: {
            kind: "ref",
            name: "index",
          },
        },
        { bindings: {} },
        { maxCollectionItems: 4 },
      )
    ).toThrowError(SafeConfigEvaluationError);
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
