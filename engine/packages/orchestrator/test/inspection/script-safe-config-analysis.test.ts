import { describe, expect, it } from "vitest";
import type { ParsedScriptFile } from "../../../../analyzers/scripts/src/index.js";
import { parseScriptFile } from "../../../../analyzers/scripts/src/index.js";
import { analyzeScriptSafeConfig } from "../../src/inspection/script-safe-config-analysis.js";

function parsed(identifier: string, text: string): ParsedScriptFile {
  return parseScriptFile(
    identifier,
    text,
    {
      artifactId: "fixture",
      relativePath: `scripts/${identifier}.ts`,
    },
  );
}

describe("script safe config analysis", () => {
  it("resolves a consistent explicit arena count", () => {
    const result = analyzeScriptSafeConfig([
      parsed("a", "const ARENA_COUNT = 3 + 3;"),
      parsed("b", "const MAX_ARENAS = 6;"),
    ]);

    expect(result.resolvedArenaCount).toBe(6);
    expect(result.arenaCountConflict).toBe(false);
  });

  it("separates physical arena count from runtime concurrency cap", () => {
    const result = analyzeScriptSafeConfig([
      parsed(
        "arena",
        [
          "const ARENA_COUNT = 6;",
          "const MAX_CONCURRENT_ARENAS = 2;",
        ].join("\n"),
      ),
    ]);

    expect(result.resolvedArenaCount).toBe(6);
    expect(
      result.resolvedArenaConcurrencyLimit,
    ).toBe(2);
    expect(result.arenaCountConflict).toBe(false);
    expect(
      result.arenaConcurrencyConflict,
    ).toBe(false);
  });


  it("resolves an immutable bundler-lowered var concurrency cap", () => {
    const result = analyzeScriptSafeConfig([
      parsed(
        "bundle",
        [
          "var ARENA_COUNT = 6;",
          "var MAX_CONCURRENT_ARENAS = 2;",
          "function queue() {",
          "  return MAX_CONCURRENT_ARENAS;",
          "}",
        ].join("\n"),
      ),
    ]);

    expect(result.resolvedArenaCount).toBe(6);
    expect(
      result.resolvedArenaConcurrencyLimit,
    ).toBe(2);
  });

  it("rejects a reassigned bundler-lowered concurrency variable", () => {
    const result = analyzeScriptSafeConfig([
      parsed(
        "bundle",
        [
          "var MAX_CONCURRENT_ARENAS = 2;",
          "MAX_CONCURRENT_ARENAS = 4;",
        ].join("\n"),
      ),
    ]);

    expect(
      result.resolvedArenaConcurrencyLimit,
    ).toBeUndefined();
    expect(
      result.failedBindings.some(
        (item) =>
          item.name ===
            "MAX_CONCURRENT_ARENAS" &&
          item.reason === "non-const",
      ),
    ).toBe(true);
  });

  it("resolves named relative imports and aliases without executing modules", () => {
    const result = analyzeScriptSafeConfig([
      parsed(
        "config",
        [
          "export const BASE_COUNT = 3;",
          "export const ARENA_OFFSETS = [",
          "  { x: 0, y: 0, z: 0 },",
          "  { x: 100, y: 0, z: 0 },",
          "];",
        ].join("\n"),
      ),
      parsed(
        "main",
        [
          "import { BASE_COUNT as N, ARENA_OFFSETS } from '../config';",
          "const ARENA_COUNT = N * 2;",
          "const COPY = ARENA_OFFSETS;",
        ].join("\n"),
      ),
    ]);

    expect(result.resolvedArenaCount).toBe(2);
    expect(
      result.resolvedBindings.find(
        (item) =>
          item.scriptId === "main" &&
          item.name === "COPY",
      )?.value,
    ).toEqual([
      { x: 0, y: 0, z: 0 },
      { x: 100, y: 0, z: 0 },
    ]);
    expect(result.crossFileResolvedBindings).toBeGreaterThan(0);
  });

  it("resolves imported pure helpers used by map callbacks", () => {
    const result = analyzeScriptSafeConfig([
      parsed(
        "config",
        [
          "export const BASE = { x: 10, y: 20, z: 30 };",
          "export function shift(offset) { return translate3(BASE, offset); }",
        ].join("\n"),
      ),
      parsed(
        "main",
        [
          "import { shift as makeArena } from '../config';",
          "const ARENA_CENTERS = [{ x: 0, y: 0, z: 0 }, { x: 100, y: 0, z: 0 }].map(makeArena);",
        ].join("\n"),
      ),
    ]);

    expect(
      result.resolvedBindings.find(
        (item) =>
          item.scriptId === "main" &&
          item.name === "ARENA_CENTERS",
      )?.value,
    ).toEqual([
      { x: 10, y: 20, z: 30 },
      { x: 110, y: 20, z: 30 },
    ]);
    expect(result.resolvedArenaCount).toBe(2);
    expect(result.resolvedArenaLayout).toMatchObject({
      mode: "absolute-centers",
      arenaCount: 2,
    });
  });

  it("fails closed on cross-file reference cycles", () => {
    const result = analyzeScriptSafeConfig([
      parsed(
        "a",
        [
          "import { B } from '../b';",
          "export const A = B;",
        ].join("\n"),
      ),
      parsed(
        "b",
        [
          "import { A } from '../a';",
          "export const B = A;",
        ].join("\n"),
      ),
    ]);

    expect(result.failedBindings.length).toBeGreaterThan(0);
    expect(
      result.failedBindings.some((item) =>
        item.reason.includes("cycle")
      ),
    ).toBe(true);
  });

  it("keeps conflicting arena counts unresolved", () => {
    const result = analyzeScriptSafeConfig([
      parsed("a", "const ARENA_COUNT = 6;"),
      parsed("b", "const MAX_ARENAS = 5;"),
    ]);

    expect(result.resolvedArenaCount).toBeUndefined();
    expect(result.arenaCountConflict).toBe(true);
  });
});
