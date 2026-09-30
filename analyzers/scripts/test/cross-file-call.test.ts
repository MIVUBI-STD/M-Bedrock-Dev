import { describe, expect, it } from "vitest";
import {
  deriveCrossFileCallEdges,
} from "../src/cross-file-call.js";

describe("cross-file call resolution", () => {
  it("resolves named ESM imports across TypeScript .js specifiers", () => {
    const edges = deriveCrossFileCallEdges([
      {
        path: "scripts/cleanup.ts",
        text: "export function releaseArena() {}",
        source: { artifactId: "map", relativePath: "scripts/cleanup.ts" },
      },
      {
        path: "scripts/main.ts",
        text: `
          import { releaseArena } from "./cleanup.js";
          export function finishGame() {
            releaseArena();
          }
        `,
        source: { artifactId: "map", relativePath: "scripts/main.ts" },
      },
    ]);

    expect(edges).toEqual([
      expect.objectContaining({
        callerModule: "scripts/main.ts",
        callerRegion: "function:finishGame",
        targetModule: "scripts/cleanup.ts",
        targetExport: "releaseArena",
        controlFlow: "unconditional",
        status: "resolved",
      }),
    ]);
  });

  it("keeps a call unresolved when the module exists but the imported export does not", () => {
    const edges = deriveCrossFileCallEdges([
      {
        path: "scripts/cleanup.ts",
        text: "export function cleanupArena() {}",
        source: { artifactId: "map", relativePath: "scripts/cleanup.ts" },
      },
      {
        path: "scripts/main.ts",
        text: `
          import { releaseArena } from "./cleanup.js";
          export function finishGame() {
            releaseArena();
          }
        `,
        source: { artifactId: "map", relativePath: "scripts/main.ts" },
      },
    ]);

    expect(edges[0]).toEqual(
      expect.objectContaining({
        targetModule: "scripts/cleanup.ts",
        targetExport: "releaseArena",
        status: "unresolved",
      }),
    );
  });

  it("resolves namespace imports to the implementation module", () => {
    const edges = deriveCrossFileCallEdges([
      {
        path: "scripts/arena.ts",
        text: "export function cleanupArena() {}",
        source: { artifactId: "map", relativePath: "scripts/arena.ts" },
      },
      {
        path: "scripts/main.ts",
        text: `
          import * as arena from "./arena.js";
          export function finishGame() {
            arena.cleanupArena();
          }
        `,
        source: { artifactId: "map", relativePath: "scripts/main.ts" },
      },
    ]);

    expect(edges[0]).toEqual(
      expect.objectContaining({
        targetModule: "scripts/arena.ts",
        targetExport: "cleanupArena",
        localName: "arena.cleanupArena",
        status: "resolved",
      }),
    );
  });

  it("follows named re-export barrel chains to the implementation module", () => {
    const edges = deriveCrossFileCallEdges([
      {
        path: "scripts/cleanup.ts",
        text: "export function cleanupArena() {}",
        source: { artifactId: "map", relativePath: "scripts/cleanup.ts" },
      },
      {
        path: "scripts/barrel.ts",
        text: 'export { cleanupArena } from "./cleanup.js";',
        source: { artifactId: "map", relativePath: "scripts/barrel.ts" },
      },
      {
        path: "scripts/index.ts",
        text: 'export { cleanupArena } from "./barrel.js";',
        source: { artifactId: "map", relativePath: "scripts/index.ts" },
      },
      {
        path: "scripts/main.ts",
        text: `
          import { cleanupArena } from "./index.js";
          export function finishGame() {
            cleanupArena();
          }
        `,
        source: { artifactId: "map", relativePath: "scripts/main.ts" },
      },
    ]);

    expect(edges[0]).toEqual(
      expect.objectContaining({
        targetModule: "scripts/cleanup.ts",
        targetExport: "cleanupArena",
        status: "resolved",
      }),
    );
  });

  it("resolves local export aliases to the implementation symbol", () => {
    const edges = deriveCrossFileCallEdges([
      {
        path: "scripts/cleanup.ts",
        text: `
          function cleanup() {}
          export { cleanup as cleanupArena };
        `,
        source: { artifactId: "map", relativePath: "scripts/cleanup.ts" },
      },
      {
        path: "scripts/main.ts",
        text: `
          import { cleanupArena } from "./cleanup.js";
          export function finishGame() {
            cleanupArena();
          }
        `,
        source: { artifactId: "map", relativePath: "scripts/main.ts" },
      },
    ]);

    expect(edges[0]).toEqual(
      expect.objectContaining({
        targetModule: "scripts/cleanup.ts",
        targetExport: "cleanup",
        status: "resolved",
      }),
    );
  });

  it("resolves named default exports to the implementation symbol", () => {
    const edges = deriveCrossFileCallEdges([
      {
        path: "scripts/cleanup.ts",
        text: "export default function cleanupArena() {}",
        source: { artifactId: "map", relativePath: "scripts/cleanup.ts" },
      },
      {
        path: "scripts/main.ts",
        text: `
          import cleanup from "./cleanup.js";
          export function finishGame() {
            cleanup();
          }
        `,
        source: { artifactId: "map", relativePath: "scripts/main.ts" },
      },
    ]);

    expect(edges[0]).toEqual(
      expect.objectContaining({
        targetModule: "scripts/cleanup.ts",
        targetExport: "cleanupArena",
        status: "resolved",
      }),
    );
  });

});
