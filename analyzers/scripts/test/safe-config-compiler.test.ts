import { describe, expect, it } from "vitest";
import { evaluateSafeConfig } from "../../../packages/behavior-model/src/index.js";
import { compileScriptSafeConfig } from "../src/safe-config-compiler.js";

const source = {
  artifactId: "fixture",
  relativePath: "scripts/config.ts",
};

describe("safe config compiler", () => {
  it("compiles deterministic arena constants without executing source", () => {
    const result = compileScriptSafeConfig(
      [
        "const BASE = { x: 10, y: 20, z: 30 };",
        "const OFFSET = { x: 100, y: 0, z: -20 };",
        "const CENTER = translate3(BASE, OFFSET);",
        "const ARENA_COUNT = 2 + 4;",
      ].join("\n"),
      source,
    );

    const bindings = Object.fromEntries(
      result.bindings.map((item) => [
        item.name,
        item.expression,
      ]),
    );

    expect(
      evaluateSafeConfig(
        { kind: "ref", name: "CENTER" },
        { bindings },
      ),
    ).toEqual({ x: 110, y: 20, z: 10 });
    expect(
      evaluateSafeConfig(
        { kind: "ref", name: "ARENA_COUNT" },
        { bindings },
      ),
    ).toBe(6);
    expect(result.rejected).toEqual([]);
  });

  it("rejects impure calls and mutable declarations", () => {
    const result = compileScriptSafeConfig(
      [
        "let current = 1;",
        "const dynamic = world.getPlayers();",
      ].join("\n"),
      source,
    );

    expect(result.bindings).toEqual([]);
    expect(result.rejected.map((item) => item.reason))
      .toEqual(["unsupported-call", "non-const"].sort());
  });

  it("supports safe property access chains", () => {
    const result = compileScriptSafeConfig(
      [
        "const CONFIG = { arena: { count: 6 } };",
        "const COUNT = CONFIG.arena.count;",
      ].join("\n"),
      source,
    );

    const bindings = Object.fromEntries(
      result.bindings.map((item) => [
        item.name,
        item.expression,
      ]),
    );
    expect(
      evaluateSafeConfig(
        { kind: "ref", name: "COUNT" },
        { bindings },
      ),
    ).toBe(6);
  });
});
