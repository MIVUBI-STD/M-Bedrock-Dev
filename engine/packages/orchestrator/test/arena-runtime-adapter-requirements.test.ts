import { describe, expect, it } from "vitest";
import { deriveArenaRuntimeAdapterRequirements } from "../src/arena-runtime-adapter-requirements.js";

describe("arena runtime adapter requirements", () => {
  it("derives baseline surfaces and live-client needs from validation plans", () => {
    const result =
      deriveArenaRuntimeAdapterRequirements({
        arenaAnalysis: {
          autoDetected: true,
          spatialLayout: {
            basis: "topology",
            canonical: {
              arenaId: "arena-1",
              anchor: { x: 0, y: 0, z: 0 },
            },
            replicas: [],
            offsets: [],
            confidence: "high",
          },
          stressPlan: {
            status: "planned",
            reasons: [],
            matrix: {
              schemaVersion: 1,
              arenaIds: ["arena-1"],
              playersPerArena: 5,
              totalNominalPlayers: 5,
              scenarios: [{
                id: "disconnect",
                kind: "disconnect-during-active",
                arenaIds: ["arena-1"],
                playerIds: ["p"],
                invariants: [],
                purpose: "disconnect",
              }],
              byKind: {} as any,
            },
          },
          repeatedRunPlan: {
            schemaVersion: 1,
            runCounts: [1],
            stages: [{
              runs: 1,
              scope: "single-arena",
              invariants: [],
              compareSurfaces: [
                "arena-membership",
                "dynamic-properties",
                "deferred-callbacks",
              ],
              purpose: "repeat",
            }],
          },
          globalState: {
            mutations: [{
              id: "g",
              ownerKind: "script",
              ownerId: "main",
              executionRegion: "function:start",
              resource: "gamerule:pvp",
              command: "gamerule pvp false",
              arenaScoped: true,
              source: {
                artifactId: "fixture",
                relativePath: "scripts/main.ts",
              },
            }],
            assessments: [],
            arenaScopedMutations: 1,
            pairedLeaseEvidence: 0,
            partialLeaseEvidence: 0,
            unleasedArenaMutations: 1,
            unscopedMutations: 0,
            unauditedArenaMutations: 1,
          },
        },
      } as any);

    expect(result.requiredHooks).toEqual(
      expect.arrayContaining([
        "resetArena",
        "startArena",
        "finishArena",
        "captureArenaBaseline",
        "compareArenaBaseline",
        "disconnectPlayer",
      ]),
    );
    expect(result.requiredBaselineSurfaces)
      .toContain("dynamic-properties");
    expect(result.requiredGlobalResources)
      .toEqual(["gamerule:pvp"]);
    expect(result.liveClientLifecycleRequired)
      .toBe(true);
  });
});
