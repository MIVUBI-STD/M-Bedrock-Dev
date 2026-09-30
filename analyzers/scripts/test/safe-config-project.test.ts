import { describe, expect, it } from "vitest";
import {
  evaluateScriptSafeConfigExport,
  linkScriptSafeConfigProject,
} from "../src/safe-config-project.js";

const source = (relativePath: string) => ({
  artifactId: "artifact:test",
  relativePath,
});

describe("safe-config project linker", () => {
  it("resolves deterministic imports and exports across script modules", () => {
    const project = linkScriptSafeConfigProject([
      {
        path: "scripts/base.ts",
        source: source("scripts/base.ts"),
        text: `
          export const BASE = { x: 100, y: 50, z: 200 };
          export const STEP = 512;
        `,
      },
      {
        path: "scripts/arena.ts",
        source: source("scripts/arena.ts"),
        text: `
          import { BASE, STEP } from "./base";
          const makeArena = (index) => ({
            x: BASE.x + index * STEP,
            y: BASE.y,
            z: BASE.z
          });
          export const ENABLED_ARENAS = Array.from(
            { length: 3 },
            (_, index) => makeArena(index)
          );
        `,
      },
    ]);

    expect(project.diagnostics).toEqual([]);
    expect(
      evaluateScriptSafeConfigExport(
        project,
        "scripts/arena.ts",
        "ENABLED_ARENAS",
      ),
    ).toEqual([
      { x: 100, y: 50, z: 200 },
      { x: 612, y: 50, z: 200 },
      { x: 1124, y: 50, z: 200 },
    ]);
  });

  it("fails closed when an imported module cannot be resolved", () => {
    const project = linkScriptSafeConfigProject([
      {
        path: "scripts/arena.ts",
        source: source("scripts/arena.ts"),
        text: `
          import { BASE } from "./missing";
          export const ARENA = { x: BASE.x, y: 0, z: 0 };
        `,
      },
    ]);

    expect(project.diagnostics).toEqual([
      expect.objectContaining({
        kind: "missing-module",
        symbol: "BASE",
      }),
    ]);
  });
});
