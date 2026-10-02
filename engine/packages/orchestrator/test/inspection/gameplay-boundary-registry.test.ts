import { describe, expect, it } from "vitest";
import {
  buildGameplayBoundaryRegistry,
} from "../../src/inspection/gameplay-boundary-registry.js";

describe("gameplay boundary registry", () => {
  it("extracts meaningful boundary cases from resolved gameplay config", () => {
    const registry =
      buildGameplayBoundaryRegistry({
        compiledBindings: 3,
        rejectedBindings: 0,
        crossFileResolvedBindings: 0,
        resolvedBindings: [
          {
            scriptId: "main",
            name: "MAX_RETRIES",
            value: 5,
            source: {
              artifactId: "map",
              relativePath: "scripts/main.ts",
            },
          },
          {
            scriptId: "main",
            name: "LEVEL_COUNT",
            value: 15,
            source: {
              artifactId: "map",
              relativePath: "scripts/main.ts",
            },
          },
          {
            scriptId: "main",
            name: "DECORATIVE_OFFSET",
            value: 7,
            source: {
              artifactId: "map",
              relativePath: "scripts/main.ts",
            },
          },
        ],
        failedBindings: [],
        arenaCountCandidates: [],
        arenaConcurrencyCandidates: [],
        arenaLayoutCandidates: [],
        arenaCountConflict: false,
        arenaConcurrencyConflict: false,
        arenaLayoutConflict: false,
      });

    expect(
      registry.records.map((item) => item.name),
    ).toEqual(["LEVEL_COUNT", "MAX_RETRIES"]);
    expect(
      registry.records.find(
        (item) => item.name === "MAX_RETRIES",
      )?.cases,
    ).toEqual([0, 1, 4, 5, 6]);
  });

  it("keeps failed gameplay boundaries explicit", () => {
    const registry =
      buildGameplayBoundaryRegistry({
        compiledBindings: 1,
        rejectedBindings: 1,
        crossFileResolvedBindings: 0,
        resolvedBindings: [],
        failedBindings: [{
          scriptId: "main",
          name: "MAX_PLAYERS",
          reason: "unresolved reference",
          source: {
            artifactId: "map",
            relativePath: "scripts/main.ts",
          },
        }],
        arenaCountCandidates: [],
        arenaConcurrencyCandidates: [],
        arenaLayoutCandidates: [],
        arenaCountConflict: false,
        arenaConcurrencyConflict: false,
        arenaLayoutConflict: false,
      });

    expect(registry.unresolvedNames)
      .toEqual(["MAX_PLAYERS"]);
  });
});
