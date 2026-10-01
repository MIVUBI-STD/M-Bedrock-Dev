import { describe, expect, it } from "vitest";
import {
  evaluateScriptSafeConfigExport,
  linkScriptSafeConfigProject,
} from "../../src/config/safe-config-project.js";

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

  it("resolves multi-hop named re-export barrels", () => {
    const project = linkScriptSafeConfigProject([
      {
        path: "scripts/base.ts",
        source: source("scripts/base.ts"),
        text: `
          export const ARENA_COUNT = 6;
        `,
      },
      {
        path: "scripts/barrel.ts",
        source: source("scripts/barrel.ts"),
        text: `
          export { ARENA_COUNT } from "./base.js";
        `,
      },
      {
        path: "scripts/index.ts",
        source: source("scripts/index.ts"),
        text: `
          export { ARENA_COUNT } from "./barrel.js";
        `,
      },
      {
        path: "scripts/config.ts",
        source: source("scripts/config.ts"),
        text: `
          import { ARENA_COUNT } from "./index.js";
          export const VALUE = ARENA_COUNT + 1;
        `,
      },
    ]);

    expect(project.diagnostics).toEqual([]);
    expect(
      evaluateScriptSafeConfigExport(
        project,
        "scripts/config.ts",
        "VALUE",
      ),
    ).toBe(7);
  });

  it("resolves deterministic default exports and imports", () => {
    const project = linkScriptSafeConfigProject([
      {
        path: "scripts/base.ts",
        source: source("scripts/base.ts"),
        text: `
          const CONFIG = { arenaCount: 4 };
          export default CONFIG;
        `,
      },
      {
        path: "scripts/config.ts",
        source: source("scripts/config.ts"),
        text: `
          import CONFIG from "./base.js";
          export const COUNT = CONFIG.arenaCount;
        `,
      },
    ]);

    expect(project.diagnostics).toEqual([]);
    expect(
      evaluateScriptSafeConfigExport(
        project,
        "scripts/config.ts",
        "COUNT",
      ),
    ).toBe(4);
  });

  it("exposes deterministic namespace imports as read-only export objects", () => {
    const project = linkScriptSafeConfigProject([
      {
        path: "scripts/base.ts",
        source: source("scripts/base.ts"),
        text: `
          export const COUNT = 3;
          export const OFFSET = 64;
        `,
      },
      {
        path: "scripts/config.ts",
        source: source("scripts/config.ts"),
        text: `
          import * as base from "./base.js";
          export const VALUE = base.COUNT * base.OFFSET;
        `,
      },
    ]);

    expect(project.diagnostics).toEqual([]);
    expect(
      evaluateScriptSafeConfigExport(
        project,
        "scripts/config.ts",
        "VALUE",
      ),
    ).toBe(192);
  });

  it("fails closed on ambiguous star re-exports", () => {
    const project = linkScriptSafeConfigProject([
      {
        path: "scripts/a.ts",
        source: source("scripts/a.ts"),
        text: "export const COUNT = 2;",
      },
      {
        path: "scripts/b.ts",
        source: source("scripts/b.ts"),
        text: "export const COUNT = 3;",
      },
      {
        path: "scripts/index.ts",
        source: source("scripts/index.ts"),
        text: `
          export * from "./a.js";
          export * from "./b.js";
        `,
      },
      {
        path: "scripts/config.ts",
        source: source("scripts/config.ts"),
        text: `
          import { COUNT } from "./index.js";
          export const VALUE = COUNT;
        `,
      },
    ]);

    expect(
      project.diagnostics,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "ambiguous-export",
          symbol: "COUNT",
        }),
      ]),
    );
    expect(() =>
      evaluateScriptSafeConfigExport(
        project,
        "scripts/config.ts",
        "VALUE",
      )
    ).toThrow();
  });


  it("reports missing modules behind star re-exports", () => {
    const project = linkScriptSafeConfigProject([
      {
        path: "scripts/index.ts",
        source: source("scripts/index.ts"),
        text: 'export * from "./missing.js";',
      },
    ]);

    expect(project.diagnostics).toEqual([
      expect.objectContaining({
        kind: "missing-module",
        modulePath: "scripts/index.ts",
      }),
    ]);
  });


  it("materializes only value exports in namespace objects", () => {
    const project = linkScriptSafeConfigProject([
      {
        path: "scripts/base.ts",
        source: source("scripts/base.ts"),
        text: `
          export const COUNT = 5;
          export function make(value) { return value + 1; }
        `,
      },
      {
        path: "scripts/config.ts",
        source: source("scripts/config.ts"),
        text: `
          import * as base from "./base.js";
          export const VALUE = base.COUNT;
        `,
      },
    ]);

    expect(project.diagnostics).toEqual([]);
    expect(
      evaluateScriptSafeConfigExport(
        project,
        "scripts/config.ts",
        "VALUE",
      ),
    ).toBe(5);
  });

});
